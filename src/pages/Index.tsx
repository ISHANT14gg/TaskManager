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
import { toast } from "sonner";
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

  // Filter and group tasks by priority
  const taskGroups = useMemo(() => {
    const filtered = filterTasksByCategory(tasks, selectedCategory);
    const pending = filtered.filter((t) => !t.completed);
    const completed = filtered.filter((t) => t.completed);

    // Group pending tasks by urgency level
    const urgent = pending.filter((t) => getUrgencyLevel(t) === "urgent");
    const warning = pending.filter((t) => getUrgencyLevel(t) === "warning");
    const upcoming = pending.filter((t) => getUrgencyLevel(t) === "upcoming");
    const normal = pending.filter((t) => getUrgencyLevel(t) === "normal");

    return { urgent, warning, upcoming, normal, completed };
  }, [tasks, selectedCategory]);

  const handleAddTask = async (taskData: Omit<ComplianceTask, "id" | "completed">) => {
    try {
      await addTask(taskData);
      toast.success("Task added successfully");
    } catch (error: any) {
      console.error("Error adding task:", error);
      toast.error(error.message || "Failed to add task. Please try again.");
    }
  };

  const handleEditTask = (task: ComplianceTask) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleUpdateTask = async (id: string, updates: Partial<ComplianceTask>) => {
    try {
      await updateTask(id, updates);
      setEditingTask(null);
      toast.success("Task updated successfully");
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error(error.message || "Failed to update task. Please try again.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      try {
        await deleteTask(deleteConfirmId);
        setDeleteConfirmId(null);
        toast.success("Task deleted successfully");
      } catch (error: any) {
        console.error("Error deleting task:", error);
        toast.error(error.message || "Failed to delete task. Please try again.");
        setDeleteConfirmId(null);
      }
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

        {/* Task List - Prioritized by Urgency */}
        {tasks.length === 0 ? (
          <EmptyState onAddTask={handleOpenNewTask} />
        ) : (
          <div className="space-y-6">
            {/* Urgent Tasks - Highest Priority */}
            {taskGroups.urgent.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-destructive">
                      🔴 Urgent - Action Required
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {taskGroups.urgent.length} task{taskGroups.urgent.length !== 1 ? 's' : ''} requiring immediate attention
                    </p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {taskGroups.urgent.map((task) => (
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

            {/* Warning Tasks */}
            {taskGroups.warning.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-orange-500">
                      ⚠️ Warning - Due Soon
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {taskGroups.warning.length} task{taskGroups.warning.length !== 1 ? 's' : ''} due within 3 days
                    </p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {taskGroups.warning.map((task) => (
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

            {/* Upcoming Tasks */}
            {taskGroups.upcoming.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Bell className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-yellow-500">
                      📅 Upcoming - Plan Ahead
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {taskGroups.upcoming.length} task{taskGroups.upcoming.length !== 1 ? 's' : ''} due within 5 days
                    </p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {taskGroups.upcoming.map((task) => (
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

            {/* Normal Tasks */}
            {taskGroups.normal.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      📋 Normal Priority
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {taskGroups.normal.length} task{taskGroups.normal.length !== 1 ? 's' : ''} with upcoming deadlines
                    </p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {taskGroups.normal.map((task) => (
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

            {/* Completed Tasks - Collapsible */}
            {taskGroups.completed.length > 0 && (
              <section className="space-y-3 border-t pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-success">
                      ✅ Completed Tasks
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {taskGroups.completed.length} completed task{taskGroups.completed.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {taskGroups.completed.map((task) => (
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

            {/* Empty State */}
            {taskGroups.urgent.length === 0 &&
              taskGroups.warning.length === 0 &&
              taskGroups.upcoming.length === 0 &&
              taskGroups.normal.length === 0 &&
              taskGroups.completed.length === 0 && (
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
