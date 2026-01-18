import { CATEGORIES } from "@/types/task";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Landmark,
  Shield,
  Car,
  LayoutGrid,
  Tag,
} from "lucide-react";

/* ===============================
   Icon map for predefined categories
================================ */
const iconMap = {
  Receipt,
  Landmark,
  Shield,
  Car,
};

interface CategoryFilterProps {
  selected: string | null;
  onSelect: (category: string | null) => void;
  categories?: string[]; // ✅ optional to prevent crash
}

export function CategoryFilter({
  selected,
  onSelect,
  categories = [], // ✅ DEFAULT VALUE (CRITICAL – prevents white screen)
}: CategoryFilterProps) {
  // Map predefined categories by id
  const predefinedMap = new Map(
    CATEGORIES.map((c) => [c.id, c])
  );

  // Emoji detector (safe for Vite + SWC)
  const emojiRegex = /\p{Extended_Pictographic}/u;

  return (
    <div className="flex flex-wrap gap-2">
      {/* ALL button */}
      <Button
        variant={selected === null ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect(null)}
        className="gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        All
      </Button>

      {/* Dynamic categories */}
      {categories.map((category) => {
        if (!category) return null;

        const predefined = predefinedMap.get(category);
        const hasEmoji = emojiRegex.test(category);

        const Icon = predefined
          ? iconMap[predefined.icon as keyof typeof iconMap]
          : Tag;

        return (
          <Button
            key={category}
            variant={selected === category ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(category)}
            className="gap-2"
          >
            {hasEmoji ? (
              <span>{category}</span>
            ) : (
              <>
                <Icon className="h-4 w-4" />
                {predefined?.label ?? category}
              </>
            )}
          </Button>
        );
      })}
    </div>
  );
}
