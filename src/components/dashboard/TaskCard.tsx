import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Clock, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { formatDistanceToNow, isPast, isToday } from "date-fns";

type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskCardProps {
    task: Task;
    onComplete: () => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
    const isOverdue = isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline)) && !task.completed;
    const isUrgent = isOverdue || (isToday(new Date(task.deadline)) && !task.completed);

    return (
        <Card className={cn(
            "card-minimal group relative overflow-hidden transition-all duration-300 hover:scale-[1.01]",
            task.completed ? "opacity-60 bg-slate-50/50" : "bg-white",
            isUrgent && !task.completed ? "ring-1 ring-destructive/20 shadow-red-100" : ""
        )}>
            <CardContent className="p-6 flex flex-col gap-4">
                {/* Top Row: Category & Status */}
                <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="font-normal bg-slate-100 text-slate-500 hover:bg-slate-200 uppercase tracking-wider text-[10px]">
                        {task.category}
                    </Badge>

                    {task.completed ? (
                        <span className="flex items-center text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                        </span>
                    ) : (
                        <span className={cn(
                            "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                            isUrgent ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50"
                        )}>
                            {isUrgent ? 'Urgent' : 'Pending'}
                        </span>
                    )}
                </div>

                {/* Middle: Title & Deadline */}
                <div className="space-y-1">
                    <h3 className={cn(
                        "text-lg font-semibold tracking-tight leading-snug text-slate-900 group-hover:text-primary transition-colors",
                        task.completed && "line-through text-slate-400"
                    )}>
                        {task.name}
                    </h3>

                    <div className="flex items-center gap-2 text-slate-500 pt-1">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className={cn(
                            "text-sm font-medium",
                            isUrgent && !task.completed ? "text-destructive" : ""
                        )}>
                            {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
                        </span>
                    </div>
                </div>

                {/* Bottom: Action (Subtle) */}
                {!task.completed && (
                    <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                            onClick={onComplete}
                            className="w-full bg-slate-900 hover:bg-primary text-white h-9 shadow-none"
                            size="sm"
                        >
                            Mark Complete
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
