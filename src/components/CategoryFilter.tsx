import { CATEGORIES, TaskCategory } from "@/types/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Receipt, Landmark, Shield, Car, LayoutGrid } from "lucide-react";

const iconMap = {
  Receipt,
  Landmark,
  Shield,
  Car,
};

interface CategoryFilterProps {
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selected === null || selected === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect(null)}
        className="gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        All
      </Button>
      {CATEGORIES.map((category) => {
        const Icon = iconMap[category.icon as keyof typeof iconMap];
        return (
          <Button
            key={category.id}
            variant={selected === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(category.id)}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            {category.label}
          </Button>
        );
      })}
    </div>
  );
}
