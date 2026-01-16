import { useState, useEffect } from "react";
import { ComplianceTask } from "@/types/task";
import { getDefaultTasks, generateId, getNextDeadline } from "@/lib/taskUtils";

const STORAGE_KEY = "compliance_tasks";

export function useTasks() {
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const tasksWithDates = parsed.map((task: ComplianceTask) => ({
          ...task,
          deadline: new Date(task.deadline),
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        }));
        setTasks(tasksWithDates);
      } catch (e) {
        setTasks(getDefaultTasks());
      }
    } else {
      setTasks(getDefaultTasks());
    }
    setIsLoaded(true);
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, isLoaded]);

  const addTask = (task: Omit<ComplianceTask, "id" | "completed">) => {
    const newTask: ComplianceTask = {
      ...task,
      id: generateId(),
      completed: false,
    };
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<ComplianceTask>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const completeTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        
        // If recurring, create next occurrence
        if (task.recurrence !== "one-time" && !task.completed) {
          const nextDeadline = getNextDeadline(task.deadline, task.recurrence);
          if (nextDeadline) {
            // Create new task for next occurrence
            const newTask: ComplianceTask = {
              ...task,
              id: generateId(),
              deadline: nextDeadline,
              completed: false,
              completedAt: undefined,
            };
            // Add after current map completes
            setTimeout(() => {
              setTasks((prevTasks) => [...prevTasks, newTask]);
            }, 0);
          }
        }
        
        return {
          ...task,
          completed: !task.completed,
          completedAt: !task.completed ? new Date() : undefined,
        };
      })
    );
  };

  const uncompleteTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, completed: false, completedAt: undefined }
          : task
      )
    );
  };

  return {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
  };
}
