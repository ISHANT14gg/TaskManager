import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: string;
        label: string;
        positive: boolean;
    };
    className?: string;
}

export function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className,
}: StatCardProps) {
    return (
        <Card className={cn("overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                            {title}
                        </span>
                        <span className="text-3xl font-bold tracking-tight text-foreground">
                            {value}
                        </span>
                    </div>
                    <div className={cn("p-3 rounded-full bg-primary/10 text-primary")}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>

                {(trend || description) && (
                    <div className="mt-4 flex items-center gap-2 text-sm">
                        {trend && (
                            <div
                                className={cn(
                                    "flex items-center gap-1 font-medium px-2 py-0.5 rounded text-xs",
                                    trend.positive
                                        ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30"
                                        : "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30"
                                )}
                            >
                                {trend.positive ? (
                                    <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3" />
                                )}
                                {trend.value}
                            </div>
                        )}
                        {description && (
                            <span className="text-muted-foreground truncate">
                                {description}
                            </span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
