export type TaskCategory = "gst" | "income-tax" | "insurance" | "transport" | string;
export type RecurrenceType = "weekly" | "monthly" | "quarterly" | "yearly" | "one-time";
export type UrgencyLevel = "urgent" | "warning" | "upcoming" | "normal" | "completed";
export type NewComplianceTask = Omit<ComplianceTask, "id" | "completed">;

export interface ComplianceTask {
  id: string;
  name: string;
  category: TaskCategory;
  deadline: Date;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
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
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "one-time", label: "One-time" },
];
