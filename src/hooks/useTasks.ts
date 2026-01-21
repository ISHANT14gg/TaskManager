import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ComplianceTask } from "@/types/task";
import { getNextDeadline } from "@/lib/taskUtils";

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tasks from Supabase on mount
  useEffect(() => {
    if (!user) {
      setIsLoaded(true);
      return;
    }

    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("deadline", { ascending: true });

      if (error) throw error;

      // Convert database tasks to ComplianceTask format
      const formattedTasks: ComplianceTask[] = (data || []).map((task) => ({
        id: task.id,
        name: task.name,
        category: task.category.replace("_", "-") as ComplianceTask["category"],
        deadline: new Date(task.deadline),
        recurrence: task.recurrence as ComplianceTask["recurrence"],
        completed: task.completed,
        completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
        description: task.description || undefined,
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      setIsLoaded(true);
    }
  };

  const addTask = async (task: Omit<ComplianceTask, "id" | "completed">) => {
    if (!user) {
      console.error("Cannot add task: User not authenticated");
      throw new Error("User not authenticated");
    }

    try {
      // Convert category format (gst -> gst, income-tax -> income_tax)
      const dbCategory = task.category.replace("-", "_");

      console.log("Adding task to database:", {
        user_id: user.id,
        name: task.name,
        category: dbCategory,
        deadline: task.deadline.toISOString(),
      });

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          name: task.name,
          category: dbCategory,
          deadline: task.deadline.toISOString(),
          recurrence: task.recurrence,
          description: task.description || null,
          completed: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Database error adding task:", error);
        throw error;
      }

      console.log("Task added successfully:", data);

      const newTask: ComplianceTask = {
        id: data.id,
        name: data.name,
        category: data.category.replace("_", "-") as ComplianceTask["category"],
        deadline: new Date(data.deadline),
        recurrence: data.recurrence as ComplianceTask["recurrence"],
        completed: data.completed,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        description: data.description || undefined,
      };

      setTasks((prev) => [...prev, newTask]);
      return newTask;
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<ComplianceTask>) => {
    if (!user) return;

    try {
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) {
        updateData.category = updates.category.replace("-", "_");
      }
      if (updates.deadline !== undefined) {
        updateData.deadline = updates.deadline.toISOString();
      }
      if (updates.recurrence !== undefined) {
        updateData.recurrence = updates.recurrence;
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description || null;
      }
      if (updates.completed !== undefined) {
        updateData.completed = updates.completed;
        updateData.completed_at = updates.completed
          ? new Date().toISOString()
          : null;
      }

      console.log("Updating task in database:", { id, updateData });

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Database error updating task:", error);
        throw error;
      }

      console.log("Task updated successfully");

      // Update local state
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== id) return task;

          const updated: ComplianceTask = {
            ...task,
            ...updates,
            completedAt:
              updates.completed === true
                ? new Date()
                : updates.completed === false
                  ? undefined
                  : task.completedAt,
          };

          return updated;
        })
      );
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  };

  const completeTask = async (id: string) => {
    if (!user) return;

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newCompletedState = !task.completed;

    try {
      // Update in database
      await updateTask(id, {
        completed: newCompletedState,
        completedAt: newCompletedState ? new Date() : undefined,
      });

      // If recurring and completing, create next occurrence
      if (
        task.recurrence !== "one-time" &&
        !task.completed &&
        newCompletedState
      ) {
        const nextDeadline = getNextDeadline(task.deadline, task.recurrence);
        if (nextDeadline) {
          // Create new task for next occurrence
          await addTask({
            name: task.name,
            category: task.category,
            deadline: nextDeadline,
            recurrence: task.recurrence,
            description: task.description,
          });
        }
      }
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const uncompleteTask = async (id: string) => {
    await updateTask(id, {
      completed: false,
      completedAt: undefined,
    });
  };

  return {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    refreshTasks: fetchTasks,
  };
}
