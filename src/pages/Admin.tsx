import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Users, Shield, Mail, Phone, Calendar, Send, ArrowRightLeft,
  FileSpreadsheet, LayoutDashboard, ListTodo, Activity, AlertCircle,
  Clock, Settings, Plus, CheckCircle2, Search, SlidersHorizontal
} from "lucide-react";
import { triggerEmailReminders } from "@/utils/emailService";
import { TaskTransferDialog } from "@/components/TaskTransferDialog";
import { fetchUserTasks, downloadTasksCSV } from "@/utils/taskTransferService";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { CreateTaskDialog } from "@/components/dashboard/CreateTaskDialog";
import { TasksTabContent } from "@/components/dashboard/TasksTabContent";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { profileSchema } from "@/lib/validations";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default function Admin() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<(Profile & { tasks?: Task[] })[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "user" as "admin" | "user",
  });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [totalTasks, setTotalTasks] = useState(0);
  const [reminderTargetId, setReminderTargetId] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [testingAutomation, setTestingAutomation] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [automationTime, setAutomationTime] = useState("09:00");

  // User Directory filters & sorting
  const [userSearch, setUserSearch] = useState("");
  const [userSortBy, setUserSortBy] = useState<"name" | "pending" | "total">("name");
  const [userFilterRole, setUserFilterRole] = useState<"all" | "admin" | "user">("all");
  const [userFilterStatus, setUserFilterStatus] = useState<"all" | "attention" | "progress" | "ontrack" | "notasks">("all");

  const istToUtc = (ist: string) => {
    const [h, m] = ist.split(":").map(Number);
    let totalMins = h * 60 + m - 330;
    if (totalMins < 0) totalMins += 1440;
    const rh = Math.floor(totalMins / 60).toString().padStart(2, "0");
    const rm = (totalMins % 60).toString().padStart(2, "0");
    return `${rh}:${rm}`;
  };

  const utcToIst = (utc: string) => {
    if (!utc) return "09:00";
    const [h, m] = utc.split(":").map(Number);
    let totalMins = h * 60 + m + 330;
    if (totalMins >= 1440) totalMins -= 1440;
    const rh = Math.floor(totalMins / 60).toString().padStart(2, "0");
    const rm = (totalMins % 60).toString().padStart(2, "0");
    return `${rh}:${rm}`;
  };

  useEffect(() => {
    if (!profile) return;

    fetchUsers();
    fetchTotalTasks();
    fetchRecentTasks();
    fetchCategories();
    fetchOrgSettings();
  }, [profile?.id, profile?.organization_id]);

  const fetchTotalTasks = async () => {
    if (!profile?.organization_id) return;
    try {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id); // 🛡️ Org isolation

      if (error) throw error;
      setTotalTasks(count || 0);
    } catch (error) {
      console.error("Error fetching total tasks:", error);
    }
  };

  const fetchRecentTasks = async () => {
    if (!profile?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", profile.organization_id) // 🛡️ Org isolation
        .eq("completed", false)
        .order("deadline", { ascending: true })
        .limit(6);

      if (error) throw error;
      setRecentTasks(data || []);
    } catch (error) {
      console.error("Error fetching recent tasks:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch profiles first
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, completed, user_id");

      if (tasksError) throw tasksError;

      // Combine profiles with their tasks
      const usersWithTasks = (profilesData || []).map((profile) => ({
        ...profile,
        tasks: (tasksData || []).filter((task) => task.user_id === profile.id),
      }));

      setUsers(usersWithTasks);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };


  const fetchOrgSettings = async () => {
    if (!profile?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("is_automation_enabled, reminder_time")
        .eq("id", profile.organization_id)
        .single();

      if (error) throw error;
      if (data) {
        setAutomationEnabled(data.is_automation_enabled);
        setAutomationTime(utcToIst(data.reminder_time));
      }
    } catch (error) {
      console.error("Error fetching org settings:", error);
    }
  };

  const handleTestAutomation = async () => {
    setTestingAutomation(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-task-reminders", {
        body: { isAutomatedTrigger: true },
      });
      if (error) throw error;
      toast.success(data.message || "Automation scan completed!");
    } catch (error: any) {
      console.error("Automation test error:", error);
      toast.error(error.message || "Failed to run automation scan");
    } finally {
      setTestingAutomation(false);
    }
  };

  const handleSaveAutomation = async () => {
    if (!profile?.organization_id) return;
    setSavingAutomation(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          is_automation_enabled: automationEnabled,
          reminder_time: istToUtc(automationTime),
        })
        .eq("id", profile.organization_id);

      if (error) throw error;
      toast.success("Automation settings saved successfully!");
    } catch (error) {
      console.error("Error saving automation settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingAutomation(false);
    }
  };

  const fetchCategories = async () => {
    if (!profile?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!profile?.organization_id) return;
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("organization_id", profile.organization_id);
      if (error) throw error;
      setCategories(categories.filter((c) => c.id !== id));
      toast.success("Category deleted");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category. It might be in use.");
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", deleteUserId);
      if (error) throw error;
      setUsers(users.filter((u) => u.id !== deleteUserId));
      setDeleteUserId(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const handleEdit = (user: Profile) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name || "",
      email: user.email,
      phone: user.phone || "",
      role: user.role as "admin" | "user",
    });
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      // 🛡️ SECURITY: SaaS-Standard Validation (Zod)
      const validation = profileSchema.safeParse({
        full_name: editForm.full_name || undefined,
        phone: editForm.phone || undefined,
        role: editForm.role,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      const updateData = validation.data;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", editUser.id);
      if (error) throw error;
      await fetchUsers();
      setEditUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
    }
  };

  const handleExportTasks = async (user: Profile) => {
    try {
      const tasks = await fetchUserTasks(user.id);
      if (tasks.length === 0) {
        toast.info(`No tasks found for ${user.full_name || user.email}`);
        return;
      }
      downloadTasksCSV(tasks, user.full_name || user.email || "user");
      toast.success("Tasks exported successfully");
    } catch (error) {
      console.error("Error exporting tasks:", error);
      toast.error("Failed to export tasks");
    }
  };

  const handleSendReminders = async () => {
    setSendingEmails(true);
    try {
      const target = reminderTargetId === "all" ? undefined : reminderTargetId;
      const result = await triggerEmailReminders(target);
      if (result.success) {
        toast.success(`Sent ${result.sent} email reminders successfully`);
      } else {
        toast.error(result.message || "Failed to send email reminders");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send email reminders");
    } finally {
      setSendingEmails(false);
    }
  };

  // --- Handlers for TaskCard actions (Mocked for dashboard/admin view)
  const handleTaskAction = (taskId: string) => {
    toast.info("Task completion should be done by the user!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading Compliance Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Compliance Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, Admin. Here is your compliance overview.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              fetchRecentTasks();
              fetchTotalTasks();
              fetchUsers();
              setRefreshKey(prev => prev + 1);
              toast.success("Dashboard refreshed");
            }}>
              <Activity className="mr-2 h-4 w-4" /> Refresh Data
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="bg-transparent p-0 border-b border-slate-200 w-full justify-start h-auto rounded-none">
            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">Overview</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">Calendar</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">Active Tasks</TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">Categories</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">Users</TabsTrigger>
            <TabsTrigger value="automation" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">
              <Clock className="h-4 w-4 mr-2" />
              Automation
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Users"
                value={users.length}
                icon={Users}
                trend={{ value: "+2 new", label: "this month", positive: true }}
              />
              <StatCard
                title="Total Tasks"
                value={totalTasks}
                icon={ListTodo}
                trend={{ value: "+12%", label: "growth", positive: true }}
              />
              <StatCard
                title="Pending Actions"
                value={recentTasks.length}
                icon={AlertCircle}
                description="Next 7 days"
                className="border-warning/30"
              />
              <StatCard
                title="Compliance Score"
                value="98%"
                icon={Activity}
                trend={{ value: "+1%", label: "vs last week", positive: true }}
              />
            </div>

            {/* Analytics Section */}
            <AnalyticsCharts key={refreshKey} />

            {/* Quick Actions Row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Email Reminders Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Broadcast Reminders
                  </CardTitle>
                  <CardDescription>Send notifications for tasks due in 5 days</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Select value={reminderTargetId} onValueChange={setReminderTargetId}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Target User" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Check All Users</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleSendReminders} disabled={sendingEmails} className="flex-1 gap-2">
                      <Send className="h-4 w-4" />
                      {sendingEmails ? "Sending..." : "Trigger Reminders"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transfers Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                    Task Transfer
                  </CardTitle>
                  <CardDescription>Reassign tasks between team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setTransferDialogOpen(true)} variant="outline" className="w-full gap-2">
                    <ArrowRightLeft className="h-4 w-4" /> Open Transfer Tool
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Urgent Tasks Preview */}
            <div className="space-y-6">
              <h2 className="text-xl font-medium tracking-tight text-slate-800">Urgent Attention</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recentTasks.slice(0, 3).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={() => handleTaskAction(task.id)}
                  />
                ))}
                {recentTasks.length === 0 && (
                  <div className="col-span-full p-8 text-center border rounded-lg border-dashed text-muted-foreground">
                    No urgent tasks found. Excellent work!
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* CALENDAR TAB */}
          <TabsContent value="calendar" className="space-y-6">
            <CalendarView key={refreshKey} />
          </TabsContent>

          {/* TASKS TAB */}
          <TabsContent value="tasks">
            <TasksTabContent key={refreshKey} />
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Category Management</CardTitle>
                <CardDescription>View and manage task categories. Categories in use cannot be deleted.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <span className="font-medium">{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-8 w-8 p-0"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Plus className="h-4 w-4 rotate-45" />
                      </Button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="col-span-full py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                      No categories found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUTOMATION TAB */}
          <TabsContent value="automation" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Email Automation Settings
                    </CardTitle>
                    <CardDescription>
                      Configure your daily automatic reminder emails for your organization.
                    </CardDescription>
                  </div>
                  <Badge variant={automationEnabled ? "default" : "outline"} className="capitalize">
                    {automationEnabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border rounded-xl bg-slate-50/50 gap-6">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold">Automatic Reminders Status</Label>
                    <p className="text-sm text-muted-foreground max-w-md">
                      When enabled, the system will automatically scan and send reminder emails to all users
                      with pending tasks at your specified time.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 bg-white p-2 rounded-lg border shadow-sm">
                    <span className={`text-sm font-medium ${automationEnabled ? "text-primary" : "text-slate-400"}`}>
                      {automationEnabled ? "Reminders ON" : "Reminders OFF"}
                    </span>
                    <Button
                      variant={automationEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutomationEnabled(!automationEnabled)}
                      className="transition-all duration-300"
                    >
                      {automationEnabled ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 max-w-2xl">
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <Label htmlFor="reminder-time" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                        Daily Reminder Time (IST)
                      </Label>
                    </div>
                    <div className="flex items-center gap-4 border p-4 rounded-lg bg-white shadow-sm">
                      <Select value={automationTime} onValueChange={setAutomationTime}>
                        <SelectTrigger id="reminder-time" className="w-[200px] border-none shadow-none text-lg font-medium focus:ring-0">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => {
                            const hour = i.toString().padStart(2, "0");
                            return (
                              <SelectItem key={hour} value={`${hour}:00`}>
                                {hour}:00 IST
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="text-sm text-slate-500 flex flex-col items-start gap-1">
                        <div className="flex items-center gap-1 font-medium text-primary">
                          <Activity className="h-4 w-4" /> Server Time: {new Date().getUTCHours().toString().padStart(2, "0")}:00 UTC
                        </div>
                        <span className="text-[10px] text-slate-400">All automation runs in UTC</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-start gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                      <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                      Note: Notifications are processed daily at this time. Only tasks due within the configured reminder window will trigger emails.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t flex justify-end">
                  <Button
                    onClick={handleSaveAutomation}
                    disabled={savingAutomation}
                    className="min-w-[200px] shadow-lg shadow-primary/20"
                    size="lg"
                  >
                    {savingAutomation ? (
                      <>
                        <Plus className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Settings className="mr-2 h-4 w-4" /> Save Automation Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-primary/10 bg-gradient-to-br from-white to-slate-50/50">
                <CardHeader>
                  <CardTitle className="text-lg">Monitoring</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Last automated run</span>
                    <span className="font-medium">Never (Scheduled)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Emails sent today</span>
                    <span className="font-medium text-primary">0 emails</span>
                  </div>
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={handleTestAutomation}
                      disabled={testingAutomation}
                    >
                      <Activity className={`h-4 w-4 ${testingAutomation ? 'animate-spin' : ''}`} />
                      {testingAutomation ? 'Scanning...' : 'Test Full Automation Scan'}
                    </Button>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Triggers the Master Job logic for all organizations.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/10 bg-gradient-to-br from-white to-slate-50/50">
                <CardHeader>
                  <CardTitle className="text-lg">Manual Override</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Need to send reminders right now? Use the trigger on the Overview tab.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("overview")}>
                    Go to Trigger
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* USERS TAB - REDESIGNED */}
          <TabsContent value="users">
            {/* 📊 Admin Insights Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900">{users.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">With Pending</p>
                      <p className="text-2xl font-bold text-amber-900">
                        {users.filter(u => u.tasks?.some(t => !t.completed)).length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-amber-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Overloaded (&gt;10)</p>
                      <p className="text-2xl font-bold text-red-900">
                        {users.filter(u => (u.tasks?.filter(t => !t.completed).length || 0) > 10).length}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Admins / Users</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {users.filter(u => u.role === 'admin').length} / {users.filter(u => u.role === 'user').length}
                      </p>
                    </div>
                    <Shield className="h-8 w-8 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>User Directory</CardTitle>
                    <CardDescription>Manage master user list and permissions • Quick overview of workload & status</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="pl-8 w-[180px] h-9"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    {/* Sort */}
                    <Select value={userSortBy} onValueChange={(v: "name" | "pending" | "total") => setUserSortBy(v)}>
                      <SelectTrigger className="w-[130px] h-9">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="pending">Pending ↓</SelectItem>
                        <SelectItem value="total">Total Tasks ↓</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Filter Role */}
                    <Select value={userFilterRole} onValueChange={(v: "all" | "admin" | "user") => setUserFilterRole(v)}>
                      <SelectTrigger className="w-[100px] h-9">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                        <SelectItem value="user">Users</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Filter Status */}
                    <Select value={userFilterStatus} onValueChange={(v: "all" | "attention" | "progress" | "ontrack" | "notasks") => setUserFilterStatus(v)}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="attention">⚠️ Needs Attention</SelectItem>
                        <SelectItem value="progress">🔄 In Progress</SelectItem>
                        <SelectItem value="ontrack">✅ On Track</SelectItem>
                        <SelectItem value="notasks">— No Tasks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[250px]">User</TableHead>
                        <TableHead className="text-center">Tasks</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Helper to get user status
                        const getUserStatus = (user: typeof users[0]) => {
                          const total = user.tasks?.length || 0;
                          const pending = user.tasks?.filter(t => !t.completed).length || 0;
                          if (total === 0) return "notasks";
                          if (pending > 10) return "attention";
                          if (pending > 0) return "progress";
                          return "ontrack";
                        };

                        // Filter and sort users
                        const filteredUsers = users
                          .filter(user => {
                            // Search filter
                            if (userSearch) {
                              const search = userSearch.toLowerCase();
                              const matchesName = user.full_name?.toLowerCase().includes(search);
                              const matchesEmail = user.email?.toLowerCase().includes(search);
                              if (!matchesName && !matchesEmail) return false;
                            }
                            // Role filter
                            if (userFilterRole !== "all" && user.role !== userFilterRole) return false;
                            // Status filter
                            if (userFilterStatus !== "all" && getUserStatus(user) !== userFilterStatus) return false;
                            return true;
                          })
                          .sort((a, b) => {
                            if (userSortBy === "name") {
                              return (a.full_name || "").localeCompare(b.full_name || "");
                            }
                            if (userSortBy === "pending") {
                              const aPending = a.tasks?.filter(t => !t.completed).length || 0;
                              const bPending = b.tasks?.filter(t => !t.completed).length || 0;
                              return bPending - aPending; // Descending
                            }
                            if (userSortBy === "total") {
                              return (b.tasks?.length || 0) - (a.tasks?.length || 0); // Descending
                            }
                            return 0;
                          });

                        if (filteredUsers.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                {users.length === 0 ? "No users found" : "No users match your filters"}
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return filteredUsers.map((user) => {

                          const totalTasks = user.tasks?.length || 0;
                          const pendingTasks = user.tasks?.filter(t => !t.completed).length || 0;
                          const completedTasks = totalTasks - pendingTasks;

                          // Status logic
                          let statusBadge;
                          if (totalTasks === 0) {
                            statusBadge = <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">— No Tasks</Badge>;
                          } else if (pendingTasks > 10) {
                            statusBadge = <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />Needs Attention</Badge>;
                          } else if (pendingTasks > 0) {
                            statusBadge = <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
                          } else {
                            statusBadge = <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />On Track</Badge>;
                          }

                          return (
                            <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center font-semibold text-primary">
                                    {(user.full_name || user.email || "U")[0].toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm">{user.full_name || "Un-named User"}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-lg font-bold text-slate-800">{totalTasks}</span>
                                  <div className="flex gap-2 text-xs">
                                    <span className="text-amber-600 font-medium">{pendingTasks} pending</span>
                                    <span className="text-green-600 font-medium">{completedTasks} done</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {statusBadge}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={user.role === "admin" ? "default" : "secondary"} className="uppercase text-[10px]">
                                  {user.role === "admin" ? <Shield className="h-3 w-3 mr-1" /> : null}
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleExportTasks(user)}>
                                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Tasks
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                                      <Mail className="h-4 w-4 mr-2" /> Edit User
                                    </DropdownMenuItem>
                                    {user.id !== profile?.id && (
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => setDeleteUserId(user.id)}
                                      >
                                        <AlertCircle className="h-4 w-4 mr-2" /> Delete User
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* --- Dialogs (Edit, Delete, Transfer) --- */}
        {
          editUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <Card className="w-full max-w-md shadow-2xl">
                <CardHeader>
                  <CardTitle>Edit User Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (Read-only)</Label>
                    <Input value={editForm.email} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={editForm.role} onValueChange={(value: "admin" | "user") => setEditForm({ ...editForm, role: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4 justify-end">
                    <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                    <Button onClick={handleUpdate}>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        }

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user account and ALL associated tasks.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Task Transfer Dialog */}
        <TaskTransferDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          users={users}
          currentAdminId={profile?.id || ""}
          onTransferComplete={() => {
            fetchTotalTasks();
            fetchRecentTasks();
            toast.success("Task transfer completed!");
          }}
        />

        <CreateTaskDialog
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          onTaskCreated={() => {
            fetchRecentTasks();
            fetchTotalTasks();
            setRefreshKey(prev => prev + 1);
          }}
        />
      </main >
    </div >
  );
}
