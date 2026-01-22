// Settings Page - User preferences and integrations
import { Header } from "@/components/Header";
import { GoogleCalendarSettings } from "@/components/settings/GoogleCalendarSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
    const { user, profile } = useAuth();
    const [notifyEmail, setNotifyEmail] = useState(false);
    const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) {
            setNotifyEmail(profile.notify_email ?? false);
            setNotifyWhatsapp(profile.notify_whatsapp ?? false);
            setLoading(false);
        }
    }, [profile]);

    const updateNotificationSetting = async (field: "notify_email" | "notify_whatsapp", value: boolean) => {
        if (!user?.id) return;

        const { error } = await supabase
            .from("profiles")
            .update({ [field]: value })
            .eq("id", user.id);

        if (error) {
            toast.error("Failed to update notification settings");
            return;
        }

        toast.success("Notification settings updated");
    };

    const handleEmailToggle = (checked: boolean) => {
        setNotifyEmail(checked);
        updateNotificationSetting("notify_email", checked);
    };

    const handleWhatsappToggle = (checked: boolean) => {
        setNotifyWhatsapp(checked);
        updateNotificationSetting("notify_whatsapp", checked);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Header />
            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your preferences and integrations</p>
                </div>

                <div className="space-y-6">
                    {/* Notification Settings */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100">
                                    <Bell className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Notifications</CardTitle>
                                    <CardDescription>
                                        Choose how you want to receive task reminders
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="email-toggle" className="text-sm font-medium">
                                            Email Notifications
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Receive deadline reminders via email
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="email-toggle"
                                    checked={notifyEmail}
                                    onCheckedChange={handleEmailToggle}
                                    disabled={loading}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="whatsapp-toggle" className="text-sm font-medium">
                                            WhatsApp Notifications
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Receive reminders via WhatsApp (requires phone number)
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="whatsapp-toggle"
                                    checked={notifyWhatsapp}
                                    onCheckedChange={handleWhatsappToggle}
                                    disabled={loading}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Google Calendar Integration */}
                    <GoogleCalendarSettings />
                </div>
            </main>
        </div>
    );
}
