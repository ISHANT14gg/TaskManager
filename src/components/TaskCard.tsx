import { ComplianceTask, RECURRENCE_OPTIONS } from "@/types/task";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CategoryBadge } from "./CategoryBadge";
import { UrgencyBadge } from "./UrgencyBadge";
import {
  getUrgencyLevel,
  getUrgencyMessage,
  formatDeadline,
  getDaysUntilDeadline,
} from "@/lib/taskUtils";
import {
  Calendar,
  Repeat,
  Pencil,
  Trash2,
  User,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: ComplianceTask;
  onComplete: (id: string) => void;
  onEdit: (task: ComplianceTask) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const urgencyLevel = getUrgencyLevel(task);
  const urgencyMessage = getUrgencyMessage(task);
  const recurrenceLabel = RECURRENCE_OPTIONS.find(
    (r) => r.value === task.recurrence
  )?.label;

  const borderStyles = {
    urgent: "border-l-urgent",
    warning: "border-l-warning",
    upcoming: "border-l-upcoming",
    normal: "border-l-muted-foreground/30",
    completed: "border-l-success",
  };

  return (
    <Card
      className={cn(
        "animate-fade-in transition-all duration-200 hover:shadow-md border-l-4",
        borderStyles[urgencyLevel],
        task.completed && "opacity-60"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => onComplete(task.id)}
            className="mt-1"
          />

          <div className="flex-1 min-w-0">
            {/* HEADER */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3
                className={cn(
                  "font-semibold text-foreground truncate",
                  task.completed && "line-through text-muted-foreground"
                )}
              >
                {task.name}
              </h3>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(task)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* DESCRIPTION */}
            {task.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* CLIENT INFO */}
            {(task.client_name || task.client_phone) && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                {task.client_name && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{task.client_name}</span>
                  </div>
                )}
                {task.client_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{task.client_phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* BADGES */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <CategoryBadge category={task.category} />
              <UrgencyBadge level={urgencyLevel} message={urgencyMessage} />
            </div>

            {/* META */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDeadline(task.deadline)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Repeat className="h-4 w-4" />
                <span>{recurrenceLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
