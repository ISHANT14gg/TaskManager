import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: "default" | "urgent" | "warning" | "success";
}

export function StatsCard({ title, value, icon: Icon, variant = "default" }: StatsCardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    urgent: "bg-urgent/10 border-urgent/30",
    warning: "bg-warning/10 border-warning/30",
    success: "bg-success/10 border-success/30",
  };

  const iconStyles = {
    default: "text-primary",
    urgent: "text-urgent",
    warning: "text-warning",
    success: "text-success",
  };

  const valueStyles = {
    default: "text-foreground",
    urgent: "text-urgent",
    warning: "text-warning",
    success: "text-success",
  };

  return (
    <Card className={cn("border", variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className={cn("text-3xl font-bold mt-1", valueStyles[variant])}>
              {value}
            </p>
          </div>
          <div className={cn("p-3 rounded-full bg-background/50", iconStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
