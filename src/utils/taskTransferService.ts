import { supabase } from "@/integrations/supabase/client";

export interface SystemTask {
    id: string;
    name: string;
    category: string;
    deadline: string;
    completed: boolean;
    user_id: string;
    user_email?: string;
    user_name?: string;
}

/**
 * Fetch all tasks in the system (admin only)
 * Returns tasks with user information for display
 */
export async function fetchAllSystemTasks(): Promise<SystemTask[]> {
    const { data, error } = await supabase
        .from("tasks")
        .select(`
      id,
      name,
      category,
      deadline,
      completed,
      user_id,
      profiles!tasks_user_id_fkey (
        email,
        full_name
      )
    `)
        .order("deadline", { ascending: true });

    if (error) {
        console.error("Error fetching system tasks:", error);
        throw new Error("Failed to fetch tasks");
    }

    // Transform data to include user info
    return (data || []).map((task: any) => ({
        id: task.id,
        name: task.name,
        category: task.category,
        deadline: task.deadline,
        completed: task.completed,
        user_id: task.user_id,
        user_email: task.profiles?.email,
        user_name: task.profiles?.full_name,
    }));
}

/**
 * Fetch tasks for a specific user (admin fetching another user's tasks)
 */
export async function fetchUserTasks(userId: string): Promise<SystemTask[]> {
    const { data, error } = await supabase
        .from("tasks")
        .select(`
      id,
      name,
      category,
      deadline,
      completed,
      user_id
    `)
        .eq("user_id", userId)
        .order("deadline", { ascending: true });

    if (error) {
        console.error("Error fetching user tasks:", error);
        throw new Error("Failed to fetch tasks");
    }

    return (data || []).map((task: any) => ({
        id: task.id,
        name: task.name,
        category: task.category,
        deadline: task.deadline,
        completed: task.completed,
        user_id: task.user_id,
    }));
}

/**
 * Transfer tasks from one user to another
 * @param taskIds - Array of task IDs to transfer
 * @param targetUserId - The user ID to transfer tasks to
 * @param adminId - The admin performing the transfer (for audit)
 * @returns Object with success status and count of transferred tasks
 */
export async function transferTasks(
    taskIds: string[],
    targetUserId: string,
    adminId: string
): Promise<{ success: boolean; count: number; message: string }> {
    if (taskIds.length === 0) {
        return { success: false, count: 0, message: "No tasks selected" };
    }

    try {
        // Update all tasks in a single batch
        const { error } = await supabase
            .from("tasks")
            .update({
                user_id: targetUserId,
                transferred_from: adminId,
                transferred_at: new Date().toISOString(),
            })
            .in("id", taskIds);

        if (error) {
            console.error("Error transferring tasks:", error);
            throw error;
        }

        return {
            success: true,
            count: taskIds.length,
            message: `Successfully transferred ${taskIds.length} task${taskIds.length > 1 ? "s" : ""}`,
        };
    } catch (error: any) {
        console.error("Transfer failed:", error);
        return {
            success: false,
            count: 0,
            message: error.message || "Failed to transfer tasks",
        };
    }
}

/**
 * Transfer all tasks from one user to another
 * @param fromUserId - The user ID to transfer tasks FROM
 * @param toUserId - The user ID to transfer tasks TO
 * @param adminId - The admin performing the transfer
 */
export async function transferAllUserTasks(
    fromUserId: string,
    toUserId: string,
    adminId: string
): Promise<{ success: boolean; count: number; message: string }> {
    try {
        // First, get all tasks for the source user
        const { data: tasks, error: fetchError } = await supabase
            .from("tasks")
            .select("id")
            .eq("user_id", fromUserId);

        if (fetchError) {
            throw fetchError;
        }

        if (!tasks || tasks.length === 0) {
            return { success: false, count: 0, message: "No tasks found to transfer" };
        }

        const taskIds = tasks.map((t) => t.id);
        return await transferTasks(taskIds, toUserId, adminId);
    } catch (error: any) {
        console.error("Transfer all tasks failed:", error);
        return {
            success: false,
            count: 0,
            message: error.message || "Failed to transfer tasks",
        };
    }
}

/**
 * Export a user's tasks to a CSV file
 * @param tasks - Array of tasks to export
 * @param userName - Name of the user (for filename)
 */
export function downloadTasksCSV(tasks: SystemTask[], userName: string) {
    if (!tasks || tasks.length === 0) {
        return;
    }

    // Define columns
    const headers = [
        "Task ID",
        "Name",
        "Category",
        "Deadline",
        "Status"
    ];

    // Format data rows
    const rows = tasks.map(task => [
        task.id,
        `"${task.name.replace(/"/g, '""')}"`, // Escape quotes
        task.category,
        new Date(task.deadline).toLocaleDateString(),
        task.completed ? "Completed" : "Pending"
    ]);

    // Combine headers and rows
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");

    // Create a Blob
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Create download link
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().split('T')[0];
        const safeUserName = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute("href", url);
        link.setAttribute("download", `tasks_${safeUserName}_${dateStr}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
