import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAddTask: () => void;
}

export function EmptyState({ onAddTask }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <ClipboardList className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No compliance tasks yet
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Start tracking your GST, Income Tax, Insurance, and Transport compliance
        deadlines to never miss an important filing.
      </p>
      <Button onClick={onAddTask}>
        <Plus className="h-4 w-4 mr-2" />
        Add Your First Task
      </Button>
    </div>
  );
}
