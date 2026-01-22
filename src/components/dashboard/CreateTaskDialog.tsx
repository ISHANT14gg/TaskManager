import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { taskSchema } from "@/lib/validations";

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTaskCreated: () => void;
}

export function CreateTaskDialog({
    open,
    onOpenChange,
    onTaskCreated,
}: CreateTaskDialogProps) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState<Date | undefined>(new Date());

    const [formData, setFormData] = useState({
        name: "",
        category: "General",
        description: "",
        recurrence: "none",
        client_name: "",
        client_phone: "",
        amount: "", // Note: Schema update pending for this field
    });

    const templates = [
        { name: "GSTR-1 Filing", category: "GST", recurrence: "monthly", day: 11 },
        { name: "GSTR-3B Filing", category: "GST", recurrence: "monthly", day: 20 },
        { name: "TDS Payment", category: "Income Tax", recurrence: "monthly", day: 7 },
    ];

    const applyTemplate = (template: typeof templates[0]) => {
        const today = new Date();
        const targetDate = new Date(today.getFullYear(), today.getMonth(), template.day);
        if (targetDate < today) {
            targetDate.setMonth(targetDate.getMonth() + 1);
        }

        setFormData({
            ...formData,
            name: template.name,
            category: template.category,
            recurrence: template.recurrence,
        });
        setDate(targetDate);
        toast.success(`Applied template: ${template.name}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !date) return;

        setLoading(true);
        try {
            // 🛡️ SECURITY: SaaS-Standard Validation (Zod)
            const validation = taskSchema.safeParse({
                name: formData.name.trim(),
                category: formData.category,
                deadline: date,
                description: formData.description.trim() || undefined,
                client_name: formData.client_name.trim() || undefined,
                client_phone: formData.client_phone.trim() || undefined,
                recurrence: formData.recurrence === "none" ? "one-time" : formData.recurrence,
            });

            if (!validation.success) {
                toast.error(validation.error.errors[0].message);
                setLoading(false);
                return;
            }

            const taskData = validation.data;

            const { error } = await supabase.from("tasks").insert({
                user_id: profile.id,
                organization_id: profile.organization_id, // 🛡️ Multi-tenancy enforcement
                name: taskData.name,
                category: taskData.category,
                description: taskData.description || null,
                client_name: taskData.client_name || null,
                client_phone: taskData.client_phone || null,
                recurrence: taskData.recurrence,
                deadline: taskData.deadline.toISOString(),
                completed: false,
            });

            if (error) throw error;

            toast.success("Task created successfully");
            onTaskCreated();
            onOpenChange(false);
            // Reset form
            setFormData({ name: "", category: "General", description: "", recurrence: "none", client_name: "", client_phone: "", amount: "" });
            setDate(new Date());
        } catch (error: any) {
            console.error("Error creating task:", error);
            toast.error(error.message || "Failed to create task");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>
                        Add a new compliance task. Click "Quick Templates" for common filings.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <span className="text-xs text-muted-foreground self-center mr-1">Quick Templates:</span>
                    {templates.map(t => (
                        <Badge
                            key={t.name}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-1"
                            onClick={() => applyTemplate(t)}
                        >
                            <Sparkles className="w-3 h-3 text-primary" /> {t.name}
                        </Badge>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Task Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. GSTR-1 Filing"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value.substring(0, 100) })}
                            required
                            maxLength={100}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="GST">GST</SelectItem>
                                    <SelectItem value="Income Tax">Income Tax</SelectItem>
                                    <SelectItem value="Insurance">Insurance</SelectItem>
                                    <SelectItem value="Transport">Transport</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Due Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="recurrence">Recurrence</Label>
                            <Select
                                value={formData.recurrence}
                                onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">One-time</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="client_name">Client Name</Label>
                            <Input
                                id="client_name"
                                placeholder="e.g. Rahul Sharma"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value.substring(0, 100) })}
                                maxLength={100}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="client_phone">Client Phone</Label>
                            <Input
                                id="client_phone"
                                placeholder="10-digit mobile"
                                value={formData.client_phone}
                                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value.substring(0, 15) })}
                                maxLength={15}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Add details..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value.substring(0, 500) })}
                            maxLength={500}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                                </>
                            ) : (
                                "Create Task"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
