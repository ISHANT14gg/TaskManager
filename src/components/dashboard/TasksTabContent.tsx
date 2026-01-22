import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { Search, Filter, X, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export function TasksTabContent() {
    const { profile } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("pending"); // default to pending

    useEffect(() => {
        if (profile) {
            fetchTasks();
        }
    }, [searchQuery, categoryFilter, statusFilter, profile]);

    const fetchTasks = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            let query = supabase
                .from("tasks")
                .select("*")
                .eq("organization_id", profile.organization_id) // 🛡️ Org isolation
                .order("deadline", { ascending: true });

            // Apply Search
            if (searchQuery) {
                query = query.ilike("name", `%${searchQuery}%`);
            }

            // Apply Category Filter
            if (categoryFilter !== "all") {
                query = query.eq("category", categoryFilter);
            }

            // Apply Status Filter
            if (statusFilter === "pending") {
                query = query.eq("completed", false);
            } else if (statusFilter === "completed") {
                query = query.eq("completed", true);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTasks(data || []);
        } catch (error) {
            console.error("Error fetching filtered tasks:", error);
            toast.error("Failed to fetch tasks");
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setSearchQuery("");
        setCategoryFilter("all");
        setStatusFilter("pending");
    };

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[160px]">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Category" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="GST">GST</SelectItem>
                            <SelectItem value="Income Tax">Income Tax</SelectItem>
                            <SelectItem value="Insurance">Insurance</SelectItem>
                            <SelectItem value="Transport">Transport</SelectItem>
                            <SelectItem value="General">General</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear Filters">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Results Info */}
                    <div className="flex justify-between items-center text-sm text-muted-foreground px-1">
                        <span>Found {tasks.length} tasks</span>
                    </div>

                    {/* Task Grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onComplete={() => toast.info("Task completion managed by user")}
                            />
                        ))}
                        {tasks.length === 0 && (
                            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-xl text-slate-400 bg-slate-50/50">
                                <p className="text-lg font-medium">No tasks found matching your filters.</p>
                                <Button variant="link" onClick={clearFilters} className="text-primary mt-2">Clear filters</Button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
