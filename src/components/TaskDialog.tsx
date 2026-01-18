import { useState, useEffect } from "react";
import { ComplianceTask, RecurrenceType, CATEGORIES, RECURRENCE_OPTIONS } from "@/types/task";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CreatableSelect from "react-select/creatable";

/* ===============================
   Category options (existing)
================================ */
const categoryOptions = CATEGORIES.map((cat) => ({
  value: cat.label,
  label: cat.label,
}));

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: ComplianceTask | null;
  onSave: (task: Omit<ComplianceTask, "id" | "completed">) => void;
  onUpdate?: (id: string, task: Partial<ComplianceTask>) => void;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  onSave,
  onUpdate,
}: TaskDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("🧾 GST");
  const [deadline, setDeadline] = useState<Date>(new Date());
  const [recurrence, setRecurrence] = useState<RecurrenceType>("monthly");
  const [description, setDescription] = useState("");

  const isEditing = !!task;

  /* ===============================
     Populate form on edit
  ================================ */
  useEffect(() => {
    if (task) {
      setName(task.name);
      setCategory(task.category);
      setDeadline(new Date(task.deadline));
      setRecurrence(task.recurrence);
      setDescription(task.description || "");
    } else {
      setName("");
      setCategory("🧾 GST");
      setDeadline(new Date());
      setRecurrence("monthly");
      setDescription("");
    }
  }, [task, open]);

  /* ===============================
     Submit handler
  ================================ */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const taskData = {
      name: name.trim(),
      category, // ✅ custom + emoji safe
      deadline,
      recurrence,
      description: description.trim() || undefined,
    };

    if (isEditing && task && onUpdate) {
      onUpdate(task.id, taskData);
    } else {
      onSave(taskData);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Task" : "Add New Compliance Task"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">

            {/* Task Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Task Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., GSTR-3B Filing"
                required
              />
            </div>

            {/* Category (Custom + Emoji) */}
            <div className="grid gap-2">
              <Label>Category</Label>
              <CreatableSelect
                options={categoryOptions}
                value={{ value: category, label: category }}
                onChange={(option) => setCategory(option?.value ?? "")}
                placeholder="Select or create category"
                formatCreateLabel={(input) => `➕ Add "${input}"`}
                isClearable
              />
              <p className="text-xs text-muted-foreground">
                You can type your own category (emojis supported)
              </p>
            </div>

            {/* Deadline */}
            <div className="grid gap-2">
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={(date) => date && setDeadline(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Recurrence */}
            <div className="grid gap-2">
              <Label>Recurrence</Label>
              <select
                className="border rounded-md px-3 py-2"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              >
                {RECURRENCE_OPTIONS.map((rec) => (
                  <option key={rec.value} value={rec.value}>
                    {rec.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Update Task" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
