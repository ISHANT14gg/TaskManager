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
