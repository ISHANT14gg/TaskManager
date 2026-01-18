import { useState, useMemo } from "react";
import { ComplianceTask } from "@/types/task";
import { useTasks } from "@/hooks/useTasks";
import {
  filterTasksByCategory,
  getUrgencyLevel,
  getDaysUntilDeadline,
} from "@/lib/taskUtils";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { TaskCard } from "@/components/TaskCard";
import { TaskDialog } from "@/components/TaskDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  AlertTriangle,
  Bell,
  Clock,
  CheckCircle2,
} from "lucide-react";

const Index = () => {
  const {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
  } = useTasks();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] =
    useState<ComplianceTask | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] =
    useState<string | null>(null);

  // ✅ ALL categories (default + custom)
  const categories = useMemo(() => {
    return Array.from(new Set(tasks.map((t) => t.category)));
  }, [tasks]);

  // Stats
  const stats = useMemo(() => {
    const pending = tasks.filter((t) => !t.completed);
    const completed = tasks.filter((t) => t.completed);

    const urgent = pending.filter(
      (t) => getUrgencyLevel(t) === "urgent"
    );

    const dueSoon = pending.filter((t) => {
      const days = getDaysUntilDeadline(t.deadline);
      return days > 0 && days <= 5;
    });

    return {
      total: pending.length,
      urgent: urgent.length,
      dueSoon: dueSoon.length,
      completed: completed.length,
    };
  }, [tasks]);

  // Filtered task groups
  const taskGroups = useMemo(() => {
    const filtered = filterTasksByCategory(tasks, selectedCategory);
    const pending = filtered.filter((t) => !t.completed);
    const completed = filtered.filter((t) => t.completed);

    return {
      urgent: pending.filter(
        (t) => getUrgencyLevel(t) === "urgent"
      ),
      warning: pending.filter(
        (t) => getUrgencyLevel(t) === "warning"
      ),
      upcoming: pending.filter(
        (t) => getUrgencyLevel(t) === "upcoming"
      ),
      normal: pending.filter(
        (t) => getUrgencyLevel(t) === "normal"
      ),
      completed,
    };
  }, [tasks, selectedCategory]);

  const handleAddTask = async (
    taskData: Omit<ComplianceTask, "id" | "completed">
  ) => {
    try {
      await addTask(taskData);
      toast.success("Task added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add task");
    }
  };

  const handleUpdateTask = async (
    id: string,
    updates: Partial<ComplianceTask>
  ) => {
    try {
      await updateTask(id, updates);
      setEditingTask(null);
      toast.success("Task updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update task");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteTask(deleteConfirmId);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Pending" value={stats.total} icon={Clock} />
          <StatsCard
            title="Urgent"
            value={stats.urgent}
            icon={AlertTriangle}
            variant="urgent"
          />
          <StatsCard
            title="Due Soon"
            value={stats.dueSoon}
            icon={Bell}
            variant="warning"
          />
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            variant="success"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <CategoryFilter
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            categories={categories}
          />

          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Tasks */}
        {tasks.length === 0 ? (
          <EmptyState onAddTask={() => setDialogOpen(true)} />
        ) : (
          <div className="space-y-6">
            {Object.entries(taskGroups).map(
              ([key, list]) =>
                list.length > 0 && (
                  <div key={key} className="space-y-3">
                    {list.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={completeTask}
                        onEdit={(t) => {
                          setEditingTask(t);
                          setDialogOpen(true);
                        }}
                        onDelete={(id) => setDeleteConfirmId(id)}
                      />
                    ))}
                  </div>
                )
            )}
          </div>
        )}
      </main>

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        onSave={handleAddTask}
        onUpdate={handleUpdateTask}
      />

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;

