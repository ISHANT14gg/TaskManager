import { differenceInDays, addMonths, addYears, format, isAfter, isBefore, startOfDay } from "date-fns";
import { ComplianceTask, UrgencyLevel, RecurrenceType } from "@/types/task";

export function getDaysUntilDeadline(deadline: Date): number {
  const today = startOfDay(new Date());
  const deadlineDay = startOfDay(new Date(deadline));
  return differenceInDays(deadlineDay, today);
}

export function getUrgencyLevel(task: ComplianceTask): UrgencyLevel {
  if (task.completed) return "completed";
  
  const daysLeft = getDaysUntilDeadline(task.deadline);
  
  if (daysLeft < 0) return "urgent"; // Overdue
  if (daysLeft <= 1) return "urgent";
  if (daysLeft <= 3) return "warning";
  if (daysLeft <= 5) return "upcoming";
  return "normal";
}

export function getUrgencyMessage(task: ComplianceTask): string {
  if (task.completed) return "Completed";
  
  const daysLeft = getDaysUntilDeadline(task.deadline);
  
  if (daysLeft < 0) return `⚠️ Overdue by ${Math.abs(daysLeft)} day(s)`;
  if (daysLeft === 0) return "⚠️ Urgent: Due today!";
  if (daysLeft === 1) return "⚠️ Urgent: Last day tomorrow";
  if (daysLeft <= 3) return "Important: Deadline approaching";
  if (daysLeft <= 5) return "Upcoming deadline";
  return `${daysLeft} days remaining`;
}

export function shouldShowReminder(task: ComplianceTask): boolean {
  if (task.completed) return false;
  const daysLeft = getDaysUntilDeadline(task.deadline);
  return daysLeft <= 5 && daysLeft >= 0;
}

export function getNextDeadline(currentDeadline: Date, recurrence: RecurrenceType): Date | null {
  switch (recurrence) {
    case "monthly":
      return addMonths(currentDeadline, 1);
    case "quarterly":
      return addMonths(currentDeadline, 3);
    case "yearly":
      return addYears(currentDeadline, 1);
    case "one-time":
      return null;
  }
}

export function formatDeadline(date: Date): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function sortTasksByUrgency(tasks: ComplianceTask[]): ComplianceTask[] {
  return [...tasks].sort((a, b) => {
    // Completed tasks go to the end
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    
    // Sort by deadline
    const dateA = new Date(a.deadline);
    const dateB = new Date(b.deadline);
    return dateA.getTime() - dateB.getTime();
  });
}

export function filterTasksByCategory(tasks: ComplianceTask[], category: string | null): ComplianceTask[] {
  if (!category || category === "all") return tasks;
  return tasks.filter((task) => task.category === category);
}

export function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getDefaultTasks(): ComplianceTask[] {
  const today = new Date();
  
  return [
    {
      id: generateId(),
      name: "GSTR-3B Filing",
      category: "gst",
      deadline: new Date(today.getFullYear(), today.getMonth(), 20),
      recurrence: "monthly",
      completed: false,
      description: "Monthly GST return filing",
    },
    {
      id: generateId(),
      name: "GSTR-1 Filing",
      category: "gst",
      deadline: new Date(today.getFullYear(), today.getMonth(), 11),
      recurrence: "monthly",
      completed: false,
      description: "Outward supplies return",
    },
    {
      id: generateId(),
      name: "Advance Tax - Q4",
      category: "income-tax",
      deadline: new Date(today.getFullYear(), 2, 15),
      recurrence: "quarterly",
      completed: false,
      description: "Fourth installment of advance tax",
    },
    {
      id: generateId(),
      name: "TDS Return - Q3",
      category: "income-tax",
      deadline: new Date(today.getFullYear(), 0, 31),
      recurrence: "quarterly",
      completed: false,
      description: "Quarterly TDS return filing",
    },
    {
      id: generateId(),
      name: "Vehicle Insurance Renewal",
      category: "insurance",
      deadline: addMonths(today, 1),
      recurrence: "yearly",
      completed: false,
      description: "Annual vehicle insurance renewal",
    },
    {
      id: generateId(),
      name: "PUC Certificate Renewal",
      category: "transport",
      deadline: addMonths(today, 2),
      recurrence: "yearly",
      completed: false,
      description: "Pollution Under Control certificate",
    },
  ];
}
