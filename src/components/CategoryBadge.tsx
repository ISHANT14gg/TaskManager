import { TaskCategory, CATEGORIES } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Receipt, Landmark, Shield, Car } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  Receipt,
  Landmark,
  Shield,
  Car,
};

interface CategoryBadgeProps {
  category: TaskCategory;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "sm" }: CategoryBadgeProps) {
  const categoryInfo = CATEGORIES.find((c) => c.id === category);
  if (!categoryInfo) return null;

  const Icon = iconMap[categoryInfo.icon as keyof typeof iconMap];

  const categoryStyles: Record<TaskCategory, string> = {
    gst: "bg-gst-bg text-gst border-gst/20",
    "income-tax": "bg-income-tax-bg text-income-tax border-income-tax/20",
    insurance: "bg-insurance-bg text-insurance border-insurance/20",
    transport: "bg-transport-bg text-transport border-transport/20",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        categoryStyles[category],
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"
      )}
    >
      <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      {categoryInfo.label}
    </Badge>
  );
}
