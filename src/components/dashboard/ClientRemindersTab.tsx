import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Mail, Send, Loader2, Users, AlertCircle, Search, CheckCircle2, Plus, UserPlus, FolderOpen, Tag, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Predefined compliance categories
const PREDEFINED_CATEGORIES = [
    "GST",
    "ESIC",
    "PF",
    "Income Tax",
    "TDS",
    "ROC",
    "MCA",
    "Audit",
    "Other",
] as const;

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface ClientInfo {
    name: string;
    email: string;
    taskCount: number;
    pendingTasks: Task[];
    isManual?: boolean;
    category?: string;
}

export function ClientRemindersTab() {
    const { profile } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
    const [emailOverrides, setEmailOverrides] = useState<Record<string, string>>({});
    const [subject, setSubject] = useState("Reminder: Upcoming Compliance Deadline");
    const [messageBody, setMessageBody] = useState(
        `Dear Client,\n\nThis is a friendly reminder regarding your upcoming compliance deadlines. Please review and take necessary action.\n\nBest regards,\nCompliance Team`
    );

    // Persistent clients from DB
    const [dbClients, setDbClients] = useState<ClientInfo[]>([]);
    const [newClientName, setNewClientName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");

    // Category system
    const [clientCategories, setClientCategories] = useState<Record<string, string>>({});
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    // Hidden clients (deleted from view)
    const [hiddenClients, setHiddenClients] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [addCategoryOpen, setAddCategoryOpen] = useState(false);

    // Fetch all settings on load
    useEffect(() => {
        if (!profile?.organization_id) return;

        const loadAllSettings = async () => {
            try {
                // 1. Fetch Client Settings (Assignments & Hidden status)
                const { data: settingsData } = await supabase
                    .from("client_settings")
                    .select("*")
                    .eq("organization_id", profile.organization_id);

                if (settingsData) {
                    const newCategories: Record<string, string> = {};
                    const newHiddenClients: string[] = [];

                    settingsData.forEach(s => {
                        if (s.category) newCategories[s.client_name] = s.category;
                        if (s.is_hidden) newHiddenClients.push(s.client_name);
                    });

                    setClientCategories(newCategories);
                    setHiddenClients(newHiddenClients);
                }

                // 2. Fetch Hidden Categories
                const { data: hiddenCatsData } = await supabase
                    .from("hidden_categories")
                    .select("category_name")
                    .eq("organization_id", profile.organization_id);

                if (hiddenCatsData) {
                    setHiddenCategoryNames(hiddenCatsData.map(c => c.category_name));
                }

                // 3. Fetch Custom Categories
                const { data: catData } = await supabase
                    .from("categories")
                    .select("name")
                    .eq("organization_id", profile.organization_id);

                if (catData) {
                    setCustomCategories(catData.map(c => c.name));
                }

            } catch (error) {
                console.error("Error loading settings:", error);
            }
        };

        loadAllSettings();
    }, [profile?.organization_id]);

    const fetchDbClients = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .eq("organization_id", profile?.organization_id);

            if (error) throw error;

            const formatted = (data || []).map(c => ({
                name: c.name,
                email: c.email || "",
                taskCount: 0,
                pendingTasks: [],
                isManual: true, // Treat as manual for delete logic
                id: c.id // Keep ID for deletion
            }));
            setDbClients(formatted);
        } catch (error) {
            console.error("Error fetching clients:", error);
        }
    }, [profile?.organization_id]);

    // Fetch persistent clients on load
    useEffect(() => {
        if (profile?.organization_id) {
            fetchDbClients();
        }
    }, [profile?.organization_id, fetchDbClients]);

    // Hidden predefined categories
    const [hiddenCategoryNames, setHiddenCategoryNames] = useState<string[]>([]);

    const activeCategories = useMemo(() => {
        return [...PREDEFINED_CATEGORIES.filter(c => !hiddenCategoryNames.includes(c)), ...customCategories];
    }, [customCategories, hiddenCategoryNames]);

    const allCategories = useMemo(() => {
        return [...PREDEFINED_CATEGORIES, ...customCategories];
    }, [customCategories]);

    // For dropdowns, use active categories
    const dropdownCategories = activeCategories;

    const fetchTasks = useCallback(async () => {
        if (!profile?.organization_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("organization_id", profile.organization_id)
                .eq("completed", false)
                .not("client_name", "is", null)
                .order("deadline", { ascending: true });

            if (error) throw error;
            setTasks(data || []);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            toast.error("Failed to fetch client data");
        } finally {
            setLoading(false);
        }
    }, [profile?.organization_id]);

    useEffect(() => {
        if (profile?.organization_id) {
            fetchTasks();
        }
    }, [profile?.organization_id, fetchTasks]);

    // Group tasks by client name
    const clients = useMemo(() => {
        const clientMap = new Map<string, ClientInfo>();

        for (const task of tasks) {
            if (!task.client_name) continue;

            const existing = clientMap.get(task.client_name);
            if (existing) {
                existing.taskCount++;
                existing.pendingTasks.push(task);
                // Use task email if client doesn't have one yet
                if (!existing.email && (task as any).client_email) {
                    existing.email = (task as any).client_email;
                }
            } else {
                clientMap.set(task.client_name, {
                    name: task.client_name,
                    email: (task as any).client_email || "",
                    taskCount: 1,
                    pendingTasks: [task],
                });
            }
        }

        return Array.from(clientMap.values());
    }, [tasks]);

    // Merge task clients with manual clients and filter hidden ones
    // Merge task clients with DB clients and filter hidden ones
    const allClients = useMemo(() => {
        // Create a map to merge task clients and DB clients by name
        const mergedMap = new Map<string, ClientInfo>();

        // Add DB clients first
        dbClients.forEach(c => mergedMap.set(c.name.toLowerCase(), c));

        // Overlay task clients (they have task counts)
        clients.forEach(c => {
            const existing = mergedMap.get(c.name.toLowerCase());
            if (existing) {
                // Merge details: Task client takes precedence for task counts, but preserve ID/email if better
                existing.taskCount = c.taskCount;
                existing.pendingTasks = c.pendingTasks;
                if (!existing.email && c.email) existing.email = c.email;
                existing.isManual = false; // It has tasks now
            } else {
                mergedMap.set(c.name.toLowerCase(), c);
            }
        });

        const merged = Array.from(mergedMap.values());
        return merged.filter(c => !hiddenClients.includes(c.name));
    }, [clients, dbClients, hiddenClients]);

    // Filter clients by search and category
    const filteredClients = useMemo(() => {
        let result = allClients;

        // Filter by category
        if (activeCategory !== "all") {
            result = result.filter(c => clientCategories[c.name] === activeCategory);
        }

        // Filter by search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q)
            );
        }

        return result;
    }, [allClients, searchQuery, activeCategory, clientCategories]);

    // Handle category assignment (Persist to DB)
    const handleCategoryChange = async (clientName: string, category: string) => {
        const newCategory = category === "none" ? null : category;

        // Optimistic Update
        setClientCategories(prev => ({
            ...prev,
            [clientName]: newCategory || ""
        }));

        try {
            await supabase.from("client_settings").upsert({
                organization_id: profile?.organization_id,
                client_name: clientName,
                category: newCategory,
                updated_at: new Date().toISOString()
            }, { onConflict: "organization_id,client_name" });
        } catch (error) {
            console.error("Error saving category:", error);
            toast.error("Failed to save category preference");
        }
    };

    // Add new custom category
    const handleAddCategory = async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) {
            toast.error("Please enter a category name");
            return;
        }
        if ([...PREDEFINED_CATEGORIES, ...customCategories].includes(trimmed)) {
            toast.error("This category already exists");
            return;
        }

        // Optimistic
        setCustomCategories(prev => [...prev, trimmed]);
        setNewCategoryName("");
        setAddCategoryOpen(false);

        try {
            await supabase.from("categories").insert({
                organization_id: profile?.organization_id,
                name: trimmed
            });
            toast.success(`Added category: ${trimmed}`);
        } catch (error) {
            console.error("Error adding category:", error);
            toast.error("Failed to save category");
        }
    };

    // Delete/Hide category
    const handleDeleteCategory = async (category: string) => {
        // Reset active category if deleted
        if (activeCategory === category) setActiveCategory("all");

        if (PREDEFINED_CATEGORIES.includes(category as any)) {
            // Hide it
            setHiddenCategoryNames(prev => [...prev, category]); // Optimistic
            try {
                await supabase.from("hidden_categories").insert({
                    organization_id: profile?.organization_id,
                    category_name: category
                });
                toast.success(`Category "${category}" removed from view`);
            } catch (error) {
                console.error("Error hiding category:", error);
            }
        } else {
            // Delete custom
            setCustomCategories(prev => prev.filter(c => c !== category)); // Optimistic
            try {
                await supabase.from("categories").delete()
                    .eq("organization_id", profile?.organization_id)
                    .eq("name", category);
                toast.success(`Category "${category}" deleted`);
            } catch (error) {
                console.error("Error deleting category:", error);
                toast.error("Failed to delete category");
            }
        }
    };

    const handleToggleCategory = async (cat: string) => {
        const isHidden = hiddenCategoryNames.includes(cat);

        // Optimistic
        if (isHidden) {
            setHiddenCategoryNames(prev => prev.filter(c => c !== cat));
        } else {
            setHiddenCategoryNames(prev => [...prev, cat]);
        }

        try {
            if (isHidden) {
                // Show (Delete from hidden)
                await supabase.from("hidden_categories").delete()
                    .eq("organization_id", profile?.organization_id)
                    .eq("category_name", cat);
            } else {
                // Hide (Insert to hidden)
                await supabase.from("hidden_categories").insert({
                    organization_id: profile?.organization_id,
                    category_name: cat
                });
            }
        } catch (error) {
            console.error("Error toggling category:", error);
        }
    };

    // Delete client (Manual -> Delete from DB, Task -> Hide)
    const handleDeleteClient = async (clientName: string) => {
        const client = dbClients.find(c => c.name === clientName);

        if (client && client.id) {
            // It's in the DB, delete it
            try {
                const { error } = await supabase.from("clients").delete().eq("id", client.id);
                if (error) throw error;
                toast.success(`Removed client "${clientName}"`);
                fetchDbClients();
            } catch (error) {
                console.error("Error deleting client:", error);
                toast.error("Failed to delete client");
            }
        } else {
            // It's a system/task-only client, hide it locally & persist
            setHiddenClients(prev => [...prev, clientName]);
            try {
                await supabase.from("client_settings").upsert({
                    organization_id: profile?.organization_id,
                    client_name: clientName,
                    is_hidden: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: "organization_id,client_name" });
                toast.success(`Removed "${clientName}" from list`);
            } catch (error) {
                console.error("Error hiding client:", error);
                toast.error("Failed to hide client");
            }
        }
        // Remove from selection if selected
        if (selectedClients.has(clientName)) {
            const newSet = new Set(selectedClients);
            newSet.delete(clientName);
            setSelectedClients(newSet);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allNames = filteredClients.map(c => c.name);
            setSelectedClients(new Set(allNames));
        } else {
            setSelectedClients(new Set());
        }
    };

    const handleSelectClient = (clientName: string, checked: boolean) => {
        const newSet = new Set(selectedClients);
        if (checked) {
            newSet.add(clientName);
        } else {
            newSet.delete(clientName);
        }
        setSelectedClients(newSet);
    };

    const getClientEmail = (clientName: string): string => {
        return emailOverrides[clientName] || allClients.find(c => c.name === clientName)?.email || "";
    };

    const handleEmailChange = (clientName: string, email: string) => {
        setEmailOverrides(prev => ({ ...prev, [clientName]: email }));
    };

    const validateEmail = (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleAddManualClient = async () => {
        const trimmedName = newClientName.trim();
        if (!trimmedName) {
            toast.error("Please enter a client name");
            return;
        }
        if (newClientEmail.trim() && !validateEmail(newClientEmail)) {
            toast.error("Please enter a valid email address");
            return;
        }

        // Check if currently visible
        if (allClients.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
            toast.error("A client with this name already exists");
            return;
        }

        // Check if hidden (restore if so)
        if (hiddenClients.some(c => c.toLowerCase() === trimmedName.toLowerCase())) {
            setHiddenClients(prev => prev.filter(c => c.toLowerCase() !== trimmedName.toLowerCase()));
            // Unhide in DB
            await supabase.from("client_settings").upsert({
                organization_id: profile?.organization_id,
                client_name: trimmedName,
                is_hidden: false
            }, { onConflict: "organization_id,client_name" });
        }

        try {
            const { error } = await supabase.from("clients").insert({
                organization_id: profile?.organization_id,
                name: trimmedName,
                email: newClientEmail.trim() || null
            });

            if (error) throw error;

            toast.success(`Added ${trimmedName} to directory`);
            setNewClientName("");
            setNewClientEmail("");
            setActiveCategory("all");
            fetchDbClients(); // Refresh list
        } catch (error: any) {
            console.error("Error adding client:", error);
            toast.error(error.message || "Failed to add client");
        }
    };

    const handleSendReminders = async () => {
        const recipients: { email: string; name: string; tasks: string[] }[] = [];

        for (const clientName of selectedClients) {
            const email = getClientEmail(clientName);
            if (!email || !validateEmail(email)) {
                toast.error(`Invalid email for ${clientName}`);
                return;
            }
            const client = allClients.find(c => c.name === clientName);
            recipients.push({
                email,
                name: clientName,
                tasks: client?.pendingTasks.map(t => t.name) || [],
            });
        }

        if (recipients.length === 0) {
            toast.error("No clients selected");
            return;
        }

        setSending(true);
        try {
            // Check if user is authenticated
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData?.session) {
                toast.error("Please log in again to send reminders");
                return;
            }

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const response = await fetch(`${supabaseUrl}/functions/v1/send-task-reminders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({
                    clientMode: true,
                    recipients,
                    subject,
                    body: messageBody,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Function error body:", data);
                throw new Error(data.details || data.error || "Function call failed");
            }

            if (data?.errors && data.errors.length > 0) {
                console.warn("Some emails failed:", data.errors);
                // Check for common Resend error
                const resendError = data.errors.find((e: string) => e.includes("onboarding@resend.dev"));
                if (resendError) {
                    toast.error("Resend Free Tier: Can only send to your verified email address.");
                } else {
                    toast.warning(`Sent ${data.sent} emails, ${data.failed} failed`);
                }
            } else {
                toast.success(`Sent reminders to ${data?.sent || recipients.length} clients`);
            }
            setSelectedClients(new Set());
        } catch (error: any) {
            console.error("Error sending reminders:", error);
            toast.error(error.message || "Failed to send reminders");
        } finally {
            setSending(false);
        }
    };

    const selectedWithValidEmail = Array.from(selectedClients).filter(name =>
        validateEmail(getClientEmail(name))
    ).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Clients</p>
                                <p className="text-2xl font-bold text-blue-900">{allClients.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">With Email</p>
                                <p className="text-2xl font-bold text-green-900">
                                    {allClients.filter(c => c.email).length}
                                </p>
                            </div>
                            <Mail className="h-8 w-8 text-green-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Selected</p>
                                <p className="text-2xl font-bold text-amber-900">{selectedClients.size}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-amber-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Missing Email</p>
                                <p className="text-2xl font-bold text-red-900">
                                    {clients.filter(c => !c.email).length}
                                </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Filter Tabs */}
            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground mr-2">Filter by Category:</span>

                    <Badge
                        variant={activeCategory === "all" ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/80 transition-colors"
                        onClick={() => setActiveCategory("all")}
                    >
                        All ({allClients.length})
                    </Badge>

                    {activeCategories.map(cat => {
                        const count = allClients.filter(c => clientCategories[c.name] === cat).length;

                        return (
                            <Badge
                                key={cat}
                                variant={activeCategory === cat ? "default" : "outline"}
                                className={`cursor-pointer hover:bg-primary/80 transition-colors pr-1 ${activeCategory === cat ? '' : 'text-muted-foreground'}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                <span className="mr-1">{cat} ({count})</span>
                            </Badge>
                        );
                    })}

                    <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-6 gap-1 border-dashed hover:bg-green-100 px-2.5 text-xs font-normal rounded-full">
                                <Tag className="h-3 w-3" /> Manage Categories
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Manage Categories</DialogTitle>
                                <DialogDescription>
                                    Add custom categories or hide default ones you don't use.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                                {/* Add New */}
                                <div className="space-y-2">
                                    <Label htmlFor="category-name">Add New Category</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="category-name"
                                            name="categoryName"
                                            placeholder="e.g., Audit"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                                        />
                                        <Button size="sm" onClick={handleAddCategory}>Add</Button>
                                    </div>
                                </div>

                                {/* Manage Existing */}
                                <div className="space-y-2">
                                    <Label>Active Categories</Label>
                                    <div className="border rounded-md p-2 space-y-2 max-h-[200px] overflow-y-auto bg-slate-50">
                                        {PREDEFINED_CATEGORIES.map(cat => {
                                            const isHidden = hiddenCategoryNames.includes(cat);
                                            return (
                                                <div key={cat} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                                                    <span className={isHidden ? "text-muted-foreground line-through" : ""}>{cat}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => handleToggleCategory(cat)}
                                                        title={isHidden ? "Show Category" : "Hide Category"}
                                                    >
                                                        {isHidden ? <Plus className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                        {customCategories.map(cat => (
                                            <div key={cat} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                                                <span>{cat} (Custom)</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 hover:text-destructive"
                                                    onClick={() => handleDeleteCategory(cat)}
                                                    title="Delete Category"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Client List */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <CardTitle>Client Directory</CardTitle>
                                <CardDescription>Select clients to send reminders</CardDescription>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="client-search"
                                    name="clientSearch"
                                    placeholder="Search clients..."
                                    className="pl-8 w-[200px] h-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredClients.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <p>No clients found with pending tasks.</p>
                                <p className="text-sm">Add client names to your tasks to see them here.</p>
                            </div>
                        ) : (
                            <div className="rounded-md border max-h-[400px] overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead className="w-[40px]">
                                                <Checkbox
                                                    checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="text-center">Tasks</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredClients.map((client) => {
                                            const email = getClientEmail(client.name);
                                            const isValid = email && validateEmail(email);
                                            return (
                                                <TableRow key={client.name}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedClients.has(client.name)}
                                                            onCheckedChange={(checked) => handleSelectClient(client.name, !!checked)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">{client.name}</TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={clientCategories[client.name] || "none"}
                                                            onValueChange={(val) => handleCategoryChange(client.name, val)}
                                                        >
                                                            <SelectTrigger className="h-8 w-[120px]">
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">
                                                                    <span className="text-muted-foreground">None</span>
                                                                </SelectItem>
                                                                {dropdownCategories.map(cat => (
                                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="email"
                                                            name={`email-${client.name}`}
                                                            placeholder="Enter email..."
                                                            value={emailOverrides[client.name] ?? client.email}
                                                            onChange={(e) => handleEmailChange(client.name, e.target.value)}
                                                            className={`h-8 w-[200px] ${!isValid && email ? 'border-red-300' : ''}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary">{client.taskCount}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteClient(client.name)}
                                                            title="Remove Client"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Manual Client Entry */}
                        <div className="mt-4 p-4 border-2 border-dashed rounded-lg bg-slate-50/50">
                            <div className="flex items-center gap-2 mb-3">
                                <UserPlus className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Add Client Manually</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Input
                                    id="new-client-name"
                                    name="newClientName"
                                    placeholder="Client Name"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="h-9 w-[150px]"
                                />
                                <Input
                                    type="email"
                                    id="new-client-email"
                                    name="newClientEmail"
                                    placeholder="client@email.com"
                                    value={newClientEmail}
                                    onChange={(e) => setNewClientEmail(e.target.value)}
                                    className="h-9 w-[200px]"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleAddManualClient}
                                    className="h-9 gap-1"
                                >
                                    <Plus className="h-4 w-4" /> Add
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Compose Email */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            Compose Reminder
                        </CardTitle>
                        <CardDescription>Customize the email message</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                name="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Email subject..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="body">Message Body</Label>
                            <Textarea
                                id="body"
                                name="body"
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                placeholder="Write your message..."
                                rows={8}
                            />
                        </div>
                        <div className="pt-4 border-t">
                            <Button
                                onClick={handleSendReminders}
                                disabled={sending || selectedWithValidEmail === 0}
                                className="w-full gap-2"
                                size="lg"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" /> Send to {selectedWithValidEmail} Client{selectedWithValidEmail !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                            {selectedClients.size > 0 && selectedWithValidEmail < selectedClients.size && (
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {selectedClients.size - selectedWithValidEmail} selected client(s) have invalid emails
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
