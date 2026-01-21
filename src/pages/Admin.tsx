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
import { Badge } from "@/components/ui/badge";
import {
  Users, Shield, Mail, Phone, Calendar, Send, ArrowRightLeft,
  FileSpreadsheet, LayoutDashboard, ListTodo, Activity, AlertCircle
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
import { Plus } from "lucide-react";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default function Admin() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
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
  const [sendingEmails, setSendingEmails] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [totalTasks, setTotalTasks] = useState(0);
  const [reminderTargetId, setReminderTargetId] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchTotalTasks();
    fetchRecentTasks();
  }, []);

  const fetchTotalTasks = async () => {
    try {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      setTotalTasks(count || 0);
    } catch (error) {
      console.error("Error fetching total tasks:", error);
    }
  };

  const fetchRecentTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
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
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name || null,
          phone: editForm.phone || null,
          role: editForm.role,
        })
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

        <Tabs defaultValue="overview" className="space-y-12">
          <TabsList className="bg-transparent p-0 border-b border-slate-200 w-full justify-start h-auto rounded-none">
            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">Overview</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">Calendar</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">Active Tasks</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 font-medium text-slate-500">Users</TabsTrigger>
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

          {/* USERS TAB (Existing Table) */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Directory</CardTitle>
                <CardDescription>Manage master user list and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Profile</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.full_name || "Un-named User"}</span>
                                <span className="text-xs text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-sm">
                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
                                {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user.phone}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleExportTasks(user)} title="Export Tasks">
                                  <FileSpreadsheet className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>Edit</Button>
                                {user.id !== profile?.id && (
                                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteUserId(user.id)}>Delete</Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* --- Dialogs (Edit, Delete, Transfer) --- */}
        {/* Edit User Dialog */}
        {editUser && (
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
        )}

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
            fetchRecentTasks(); // Refresh tasks too
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
      </main>
    </div>
  );
}
