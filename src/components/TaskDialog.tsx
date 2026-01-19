import { useState, useEffect } from "react";
import { ComplianceTask, RecurrenceType, RECURRENCE_OPTIONS } from "@/types/task";
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
import { supabase } from "@/integrations/supabase/client";

/* ===============================
   Types
================================ */
interface CategoryOption {
  value: string;
  label: string;
}

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
  const [category, setCategory] = useState<string>("GST");
  const [deadline, setDeadline] = useState<Date>(new Date());
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("monthly");
  const [description, setDescription] = useState("");

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const isEditing = !!task;

  /* ===============================
     Fetch categories from DB
  ================================ */
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("name")
      .order("name");

    if (data) {
      setCategories(
        data.map((c) => ({
          value: c.name,
          label: c.name,
        }))
      );
    }
  };

  /* ===============================
     Populate form on edit
  ================================ */
  useEffect(() => {
    if (task) {
      setName(task.name);
      setCategory(task.category);
      setDeadline(new Date(task.deadline));
      setClientName(task.client_name || "");
      setClientPhone(task.client_phone || "");
      setRecurrence(task.recurrence);
      setDescription(task.description || "");
    } else {
      setName("");
      setCategory("GST");
      setDeadline(new Date());
      setClientName("");
      setClientPhone("");
      setRecurrence("monthly");
      setDescription("");
    }
  }, [task, open]);

  /* ===============================
     Ensure category exists (FIXED)
  ================================ */
  const ensureCategoryExists = async (value: string) => {
    if (!value?.trim()) return;

    const { error } = await supabase
      .from("categories")
      .upsert(
        { name: value.trim() },
        { onConflict: "name" }
      );

    if (error) {
      console.error("Category save failed:", error);
    }

    fetchCategories();
  };

  /* ===============================
     Submit handler
  ================================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await ensureCategoryExists(category);

    const taskData = {
      name: name.trim(),
      category,
      deadline,
      client_name: clientName.trim() || undefined,
      client_phone: clientPhone.trim() || undefined,
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
            <div className="grid gap-2">
              <Label>Task Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <CreatableSelect
                options={categories}
                value={{ value: category, label: category }}
                onChange={(opt) => setCategory(opt?.value ?? "")}
                placeholder="Select or create category"
                formatCreateLabel={(input) => `➕ Add "${input}"`}
              />
            </div>

            <div className="grid gap-2">
              <Label>Client Name</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Client Phone</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(deadline, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={(d) => d && setDeadline(d)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>Recurrence</Label>
              <select
                className="border rounded-md px-3 py-2"
                value={recurrence}
                onChange={(e) =>
                  setRecurrence(e.target.value as RecurrenceType)
                }
              >
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
