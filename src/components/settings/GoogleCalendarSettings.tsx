// Google Calendar Settings Component
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, CheckCircle2, AlertCircle, Loader2, Unlink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
    checkGoogleConnection,
    initiateGoogleAuth,
    disconnectGoogle,
    updateSyncSettings,
} from "@/utils/googleCalendarService";

export function GoogleCalendarSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState(false);
    const [syncEnabled, setSyncEnabled] = useState(false);
    const [reminderDays, setReminderDays] = useState<number[]>([1]);

    useEffect(() => {
        if (user?.id) {
            loadConnectionStatus();

            // Check for OAuth callback result
            const params = new URLSearchParams(window.location.search);
            if (params.get("google_success") === "true") {
                toast.success("Google Calendar connected successfully!");
                window.history.replaceState({}, "", window.location.pathname);
                loadConnectionStatus();
            } else if (params.get("google_error")) {
                toast.error(`Failed to connect Google Calendar: ${params.get("google_error")}`);
                window.history.replaceState({}, "", window.location.pathname);
            }
        }
    }, [user?.id]);

    const loadConnectionStatus = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const status = await checkGoogleConnection(user.id);
            setConnected(status.connected);
            setSyncEnabled(status.syncEnabled);
            setReminderDays(status.reminderDays);
        } catch (error) {
            console.error("Error loading Google connection status:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!user?.id) return;

        setConnecting(true);
        try {
            await initiateGoogleAuth(user.id);
        } catch (error) {
            toast.error("Failed to start Google Calendar connection");
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!user?.id) return;

        const success = await disconnectGoogle(user.id);
        if (success) {
            setConnected(false);
            setSyncEnabled(false);
            toast.success("Google Calendar disconnected");
        } else {
            toast.error("Failed to disconnect Google Calendar");
        }
    };

    const handleSyncToggle = async (enabled: boolean) => {
        if (!user?.id) return;

        setSyncEnabled(enabled);
        const success = await updateSyncSettings(user.id, enabled, reminderDays);
        if (success) {
            toast.success(enabled ? "Calendar sync enabled" : "Calendar sync disabled");
        } else {
            setSyncEnabled(!enabled);
            toast.error("Failed to update sync settings");
        }
    };

    const handleReminderChange = async (day: number, checked: boolean) => {
        if (!user?.id) return;

        const newDays = checked
            ? [...reminderDays, day].sort((a, b) => b - a)
            : reminderDays.filter((d) => d !== day);

        setReminderDays(newDays);
        const success = await updateSyncSettings(user.id, syncEnabled, newDays);
        if (!success) {
            setReminderDays(reminderDays);
            toast.error("Failed to update reminder settings");
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                        <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Google Calendar</CardTitle>
                        <CardDescription>
                            Sync your compliance tasks to Google Calendar
                        </CardDescription>
                    </div>
                    <div className="ml-auto">
                        {connected ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                                Not Connected
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {!connected ? (
                    // Connection CTA
                    <div className="flex flex-col items-center gap-4 py-4">
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                            Connect your Google Calendar to automatically create calendar events
                            for your tasks with reminders before deadlines.
                        </p>
                        <Button onClick={handleConnect} disabled={connecting} className="gap-2">
                            {connecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Calendar className="h-4 w-4" />
                            )}
                            Connect Google Calendar
                        </Button>
                    </div>
                ) : (
                    // Connected settings
                    <>
                        {/* Sync Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="sync-toggle" className="text-sm font-medium">
                                    Sync Tasks to Calendar
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Automatically create calendar events for new tasks
                                </p>
                            </div>
                            <Switch
                                id="sync-toggle"
                                checked={syncEnabled}
                                onCheckedChange={handleSyncToggle}
                            />
                        </div>

                        {/* Reminder Settings */}
                        {syncEnabled && (
                            <div className="space-y-3 pt-2 border-t">
                                <Label className="text-sm font-medium">Reminder Timing</Label>
                                <div className="flex flex-wrap gap-4">
                                    {[
                                        { day: 0, label: "Same day" },
                                        { day: 1, label: "1 day before" },
                                        { day: 3, label: "3 days before" },
                                        { day: 7, label: "1 week before" },
                                    ].map(({ day, label }) => (
                                        <div key={day} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`reminder-${day}`}
                                                checked={reminderDays.includes(day)}
                                                onCheckedChange={(checked) => handleReminderChange(day, !!checked)}
                                            />
                                            <label
                                                htmlFor={`reminder-${day}`}
                                                className="text-sm cursor-pointer"
                                            >
                                                {label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Disconnect Button */}
                        <div className="pt-4 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDisconnect}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                            >
                                <Unlink className="h-4 w-4" />
                                Disconnect Google Calendar
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
