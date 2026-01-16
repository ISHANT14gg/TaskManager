import { UrgencyLevel } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, CheckCircle2, Bell } from "lucide-react";

interface UrgencyBadgeProps {
  level: UrgencyLevel;
  message: string;
}

export function UrgencyBadge({ level, message }: UrgencyBadgeProps) {
  const styles: Record<UrgencyLevel, string> = {
    urgent: "bg-urgent text-urgent-foreground animate-pulse-urgent",
    warning: "bg-warning text-warning-foreground",
    upcoming: "bg-upcoming text-upcoming-foreground",
    normal: "bg-muted text-muted-foreground",
    completed: "bg-success text-success-foreground",
  };

  const icons: Record<UrgencyLevel, React.ReactNode> = {
    urgent: <AlertTriangle className="h-3 w-3 mr-1" />,
    warning: <Bell className="h-3 w-3 mr-1" />,
    upcoming: <Clock className="h-3 w-3 mr-1" />,
    normal: <Clock className="h-3 w-3 mr-1" />,
    completed: <CheckCircle2 className="h-3 w-3 mr-1" />,
  };

  return (
    <Badge className={cn("text-xs font-medium", styles[level])}>
      {icons[level]}
      {message}
    </Badge>
  );
}
