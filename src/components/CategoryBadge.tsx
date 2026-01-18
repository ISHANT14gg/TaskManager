import { TaskCategory, CATEGORIES } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Receipt, Landmark, Shield, Car, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icon map for predefined categories
 */
const iconMap = {
  Receipt,
  Landmark,
  Shield,
  Car,
};

/**
 * Predefined category styles
 */
const categoryStyles: Record<string, string> = {
  gst: "bg-gst-bg text-gst border-gst/20",
  "income-tax": "bg-income-tax-bg text-income-tax border-income-tax/20",
  insurance: "bg-insurance-bg text-insurance border-insurance/20",
  transport: "bg-transport-bg text-transport border-transport/20",
};

interface CategoryBadgeProps {
  category: TaskCategory | string;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "sm" }: CategoryBadgeProps) {
  const categoryInfo = CATEGORIES.find((c) => c.id === category);

  // ✅ Proper emoji detection
  const emojiRegex = /\p{Extended_Pictographic}/u;
  const hasEmoji = emojiRegex.test(category);

  const Icon = categoryInfo
    ? iconMap[categoryInfo.icon as keyof typeof iconMap]
    : Tag;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border flex items-center gap-1",
        categoryStyles[category] ?? "bg-muted text-foreground border-border",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"
      )}
    >
      {hasEmoji ? (
        <span>{category}</span>
      ) : (
        <>
          <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
          {categoryInfo?.label ?? category}
        </>
      )}
    </Badge>
  );
}
