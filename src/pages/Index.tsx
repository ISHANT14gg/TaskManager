import { useState, useMemo } from "react";
import { ComplianceTask } from "@/types/task";
import { useTasks } from "@/hooks/useTasks";
import {
  sortTasksByUrgency,
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
import { Plus, AlertTriangle, Bell, Clock, CheckCircle2 } from "lucide-react";

const Index = () => {
  const { tasks, isLoaded, addTask, updateTask, deleteTask, completeTask } = useTasks();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ComplianceTask | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Compute stats
  const stats = useMemo(() => {
    const pending = tasks.filter((t) => !t.completed);
    const completed = tasks.filter((t) => t.completed);
    
    const urgent = pending.filter((t) => {
      const level = getUrgencyLevel(t);
      return level === "urgent";
    });
    
    const dueSoon = pending.filter((t) => {
      const daysLeft = getDaysUntilDeadline(t.deadline);
      return daysLeft > 0 && daysLeft <= 5;
    });

    return {
      total: pending.length,
      urgent: urgent.length,
      dueSoon: dueSoon.length,
      completed: completed.length,
    };
  }, [tasks]);

  // Filter and sort tasks
  const displayedTasks = useMemo(() => {
    const filtered = filterTasksByCategory(tasks, selectedCategory);
    return sortTasksByUrgency(filtered);
  }, [tasks, selectedCategory]);

  const pendingTasks = displayedTasks.filter((t) => !t.completed);
  const completedTasks = displayedTasks.filter((t) => t.completed);

  const handleAddTask = (taskData: Omit<ComplianceTask, "id" | "completed">) => {
    addTask(taskData);
  };

  const handleEditTask = (task: ComplianceTask) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleUpdateTask = (id: string, updates: Partial<ComplianceTask>) => {
    updateTask(id, updates);
    setEditingTask(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      deleteTask(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Pending Tasks"
            value={stats.total}
            icon={Clock}
            variant="default"
          />
          <StatsCard
            title="Urgent"
            value={stats.urgent}
            icon={AlertTriangle}
            variant="urgent"
          />
          <StatsCard
            title="Due in 5 Days"
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

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <CategoryFilter
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <Button onClick={handleOpenNewTask} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Task List */}
        {tasks.length === 0 ? (
          <EmptyState onAddTask={handleOpenNewTask} />
        ) : (
          <div className="space-y-8">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Pending Tasks ({pendingTasks.length})
                </h2>
                <div className="grid gap-3">
                  {pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={completeTask}
                      onEdit={handleEditTask}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Completed ({completedTasks.length})
                </h2>
                <div className="grid gap-3">
                  {completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={completeTask}
                      onEdit={handleEditTask}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {pendingTasks.length === 0 && completedTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No tasks found in this category.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSave={handleAddTask}
        onUpdate={handleUpdateTask}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task will be permanently removed
              from your compliance tracker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
