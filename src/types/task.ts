export type TaskCategory = "gst" | "income-tax" | "insurance" | "transport";
export type RecurrenceType = "monthly" | "quarterly" | "yearly" | "one-time";
export type UrgencyLevel = "urgent" | "warning" | "upcoming" | "normal" | "completed";

export interface ComplianceTask {
  id: string;
  name: string;
  category: TaskCategory;
  deadline: Date;
  recurrence: RecurrenceType;
  completed: boolean;
  completedAt?: Date;
  description?: string;
}

export interface CategoryInfo {
  id: TaskCategory;
  label: string;
  icon: string;
  examples: string[];
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "gst",
    label: "GST",
    icon: "Receipt",
    examples: ["GSTR-1", "GSTR-3B", "GSTR-9", "GSTR-9C"],
  },
  {
    id: "income-tax",
    label: "Income Tax",
    icon: "Landmark",
    examples: ["ITR Filing", "Advance Tax", "TDS Returns", "Form 26AS"],
  },
  {
    id: "insurance",
    label: "Insurance",
    icon: "Shield",
    examples: ["Health Insurance", "Vehicle Insurance", "Business Insurance"],
  },
  {
    id: "transport",
    label: "Transport",
    icon: "Car",
    examples: ["RC Renewal", "Permit Renewal", "Pollution Certificate", "Fitness Certificate"],
  },
];

export const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "one-time", label: "One-time" },
];
