import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, User, ClipboardList, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
    fetchUserTasks,
    transferTasks,
    SystemTask,
} from "@/utils/taskTransferService";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface TaskTransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    users: Profile[];
    currentAdminId: string;
    onTransferComplete: () => void;
}

export function TaskTransferDialog({
    open,
    onOpenChange,
    users,
    currentAdminId,
    onTransferComplete,
}: TaskTransferDialogProps) {
    const [step, setStep] = useState<"select" | "confirm">("select");
    const [transferMode, setTransferMode] = useState<"all" | "selected">("all");
    const [sourceUserId, setSourceUserId] = useState<string>("");
    const [targetUserId, setTargetUserId] = useState<string>("");
    const [tasks, setTasks] = useState<SystemTask[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // Filter out the target user from source options and vice versa
    const sourceUsers = useMemo(
        () => users.filter((u) => u.id !== targetUserId),
        [users, targetUserId]
    );

    const targetUsers = useMemo(
        () => users.filter((u) => u.id !== sourceUserId),
        [users, sourceUserId]
    );

    // Selected user's display name
    const sourceUserName = useMemo(() => {
        const user = users.find((u) => u.id === sourceUserId);
        return user?.full_name || user?.email || "Unknown";
    }, [users, sourceUserId]);

    const targetUserName = useMemo(() => {
        const user = users.find((u) => u.id === targetUserId);
        return user?.full_name || user?.email || "Unknown";
    }, [users, targetUserId]);

    // Fetch tasks when source user changes
    useEffect(() => {
        if (sourceUserId) {
            setLoadingTasks(true);
            fetchUserTasks(sourceUserId)
                .then((data) => {
                    setTasks(data);
                    // Default select all tasks
                    setSelectedTaskIds(new Set(data.map((t) => t.id)));
                })
                .catch((error) => {
                    console.error("Error fetching tasks:", error);
                    toast.error("Failed to load tasks");
                    setTasks([]);
                })
                .finally(() => setLoadingTasks(false));
        } else {
            setTasks([]);
            setSelectedTaskIds(new Set());
        }
    }, [sourceUserId]);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setStep("select");
            setTransferMode("all");
            setSourceUserId("");
            setTargetUserId("");
            setTasks([]);
            setSelectedTaskIds(new Set());
        }
    }, [open]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
        } else {
            setSelectedTaskIds(new Set());
        }
    };

    const handleTaskSelect = (taskId: string, checked: boolean) => {
        const newSelected = new Set(selectedTaskIds);
        if (checked) {
            newSelected.add(taskId);
        } else {
            newSelected.delete(taskId);
        }
        setSelectedTaskIds(newSelected);
    };

    const tasksToTransfer = useMemo(() => {
        if (transferMode === "all") {
            return tasks;
        }
        return tasks.filter((t) => selectedTaskIds.has(t.id));
    }, [transferMode, tasks, selectedTaskIds]);

    const canProceed = useMemo(() => {
        if (!sourceUserId || !targetUserId) return false;
        if (sourceUserId === targetUserId) return false;
        if (tasksToTransfer.length === 0) return false;
        return true;
    }, [sourceUserId, targetUserId, tasksToTransfer]);

    const handleConfirmTransfer = async () => {
        if (!canProceed) return;

        setLoading(true);
        try {
            const taskIds = tasksToTransfer.map((t) => t.id);
            const result = await transferTasks(taskIds, targetUserId, currentAdminId);

            if (result.success) {
                toast.success(result.message);
                onTransferComplete();
                onOpenChange(false);
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to transfer tasks");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        Transfer Tasks
                    </DialogTitle>
                    <DialogDescription>
                        Transfer tasks from one user to another. This action will update task ownership.
                    </DialogDescription>
                </DialogHeader>

                {step === "select" && (
                    <div className="space-y-6 py-4 flex-1 overflow-hidden flex flex-col">
                        {/* Source User Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="source-user" className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Transfer FROM User
                            </Label>
                            <Select value={sourceUserId} onValueChange={setSourceUserId}>
                                <SelectTrigger id="source-user">
                                    <SelectValue placeholder="Select source user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sourceUsers.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{user.full_name || user.email}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {user.role}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Target User Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="target-user" className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Transfer TO User
                            </Label>
                            <Select value={targetUserId} onValueChange={setTargetUserId}>
                                <SelectTrigger id="target-user">
                                    <SelectValue placeholder="Select target user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {targetUsers.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{user.full_name || user.email}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {user.role}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Transfer Mode */}
                        {sourceUserId && (
                            <div className="space-y-3">
                                <Label>Transfer Mode</Label>
                                <RadioGroup
                                    value={transferMode}
                                    onValueChange={(v) => setTransferMode(v as "all" | "selected")}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="all" id="mode-all" />
                                        <Label htmlFor="mode-all" className="cursor-pointer">
                                            All Tasks ({tasks.length})
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="selected" id="mode-selected" />
                                        <Label htmlFor="mode-selected" className="cursor-pointer">
                                            Selected Tasks ({selectedTaskIds.size})
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}

                        {/* Task List (for selected mode) */}
                        {sourceUserId && transferMode === "selected" && (
                            <div className="h-[300px] flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="flex items-center gap-2">
                                        <ClipboardList className="h-4 w-4" />
                                        Select Tasks
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="select-all"
                                            checked={
                                                tasks.length > 0 && selectedTaskIds.size === tasks.length
                                            }
                                            onCheckedChange={handleSelectAll}
                                        />
                                        <Label htmlFor="select-all" className="text-sm cursor-pointer">
                                            Select All
                                        </Label>
                                    </div>
                                </div>

                                {loadingTasks ? (
                                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                                        Loading tasks...
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                                        No tasks found for this user
                                    </div>
                                ) : (
                                    <ScrollArea className="flex-1 border rounded-md">
                                        <div className="p-2 space-y-1">
                                            {tasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    className="flex items-center gap-3 p-2 hover:bg-muted rounded-md"
                                                >
                                                    <Checkbox
                                                        id={`task-${task.id}`}
                                                        checked={selectedTaskIds.has(task.id)}
                                                        onCheckedChange={(checked) =>
                                                            handleTaskSelect(task.id, checked as boolean)
                                                        }
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {task.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Badge variant="outline" className="text-xs">
                                                                {task.category.replace("_", "-")}
                                                            </Badge>
                                                            <span>Due: {formatDate(task.deadline)}</span>
                                                            {task.completed && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Completed
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        )}

                        {/* Validation Messages */}
                        {sourceUserId && targetUserId && sourceUserId === targetUserId && (
                            <div className="flex items-center gap-2 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                Source and target user cannot be the same
                            </div>
                        )}
                    </div>
                )}

                {step === "confirm" && (
                    <div className="py-6 space-y-4">
                        <div className="border rounded-lg p-4 bg-muted/50">
                            <h4 className="font-medium mb-3">Transfer Summary</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">From:</span>
                                    <span className="font-medium">{sourceUserName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">To:</span>
                                    <span className="font-medium">{targetUserName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tasks to transfer:</span>
                                    <span className="font-medium">{tasksToTransfer.length}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">This action will:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>Change ownership of {tasksToTransfer.length} task(s)</li>
                                        <li>Tasks will appear in {targetUserName}'s dashboard</li>
                                        <li>This transfer will be logged for audit purposes</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {step === "select" ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => setStep("confirm")}
                                disabled={!canProceed}
                                className="gap-2"
                            >
                                Continue
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep("select")}>
                                Back
                            </Button>
                            <Button
                                onClick={handleConfirmTransfer}
                                disabled={loading}
                                className="gap-2"
                            >
                                {loading ? "Transferring..." : `Transfer ${tasksToTransfer.length} Task(s)`}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
