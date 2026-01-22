import { z } from "zod";

/**
 * 🛡️ Indian Mobile Number Regex
 * - Starts with 6, 7, 8, or 9
 * - Followed by 9 digits
 * - Total 10 digits
 */
export const indianMobileRegex = /^[6-9]\d{9}$/;

/**
 * 📝 Task Validation Schema
 */
export const taskSchema = z.object({
    name: z.string()
        .min(3, "Task name must be at least 3 characters")
        .max(100, "Task name cannot exceed 100 characters")
        .trim(),
    category: z.string().min(1, "Category is required"),
    deadline: z.date({
        required_error: "Deadline is required",
        invalid_type_error: "That's not a valid date!",
    }),
    client_name: z.string().max(100, "Client name cannot exceed 100 characters").optional(),
    client_phone: z.string()
        .refine((val) => !val || indianMobileRegex.test(val), {
            message: "Invalid Indian mobile number (10 digits starting with 6-9)",
        })
        .optional(),
    recurrence: z.enum(["weekly", "monthly", "quarterly", "yearly", "one-time"]),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
});

/**
 * 👤 User Profile Validation Schema
 */
export const profileSchema = z.object({
    full_name: z.string()
        .min(2, "Full name must be at least 2 characters")
        .max(100, "Full name cannot exceed 100 characters")
        .trim()
        .optional(),
    phone: z.string()
        .refine((val) => !val || indianMobileRegex.test(val), {
            message: "Invalid Indian mobile number (10 digits starting with 6-9)",
        })
        .optional(),
    role: z.enum(["admin", "user"]),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
