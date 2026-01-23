import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Error: Missing Supabase configuration.");
    console.error("Please add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file.");
    console.error("(You can find the Service Role Key in your Supabase Dashboard > Settings > API)");
    process.exit(1);
}

// Create Supabase client with Service Role Key to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Create MCP Server
const server = new McpServer({
    name: "Compliance Companion",
    version: "1.0.0",
});

// Tool: Get Tasks
server.tool(
    "get_tasks",
    "List compliance tasks from the database",
    {
        limit: z.number().optional().default(50).describe("Max number of tasks to return"),
        status: z.enum(["all", "pending", "completed"]).optional().default("all").describe("Filter by task status"),
    },
    async ({ limit, status }) => {
        let query = supabase.from("tasks").select("*").order("deadline", { ascending: true }).limit(limit);

        if (status === "pending") {
            query = query.eq("completed", false);
        } else if (status === "completed") {
            query = query.eq("completed", true);
        }

        const { data, error } = await query;

        if (error) {
            return {
                content: [{ type: "text", text: `Error fetching tasks: ${error.message}` }],
                isError: true,
            };
        }

        if (!data || data.length === 0) {
            return {
                content: [{ type: "text", text: "No tasks found." }],
            };
        }

        // Format tasks for easier reading
        const formattedTasks = data.map((t: any) =>
            `- [${t.completed ? "x" : " "}] ${t.name} (Due: ${t.deadline.split("T")[0]}) [ID: ${t.id}]`
        ).join("\n");

        return {
            content: [{ type: "text", text: formattedTasks }],
        };
    }
);

// Tool: Add Task
server.tool(
    "add_task",
    "Create a new compliance task",
    {
        name: z.string().describe("Task name"),
        deadline: z.string().describe("Deadline (YYYY-MM-DD or ISO string)"),
        category: z.string().describe("Category (e.g., tax, audit, filing)"),
        user_id: z.string().describe("User ID to assign the task to (required for database)"),
    },
    async ({ name, deadline, category, user_id }) => {
        const { data, error } = await supabase
            .from("tasks")
            .insert({
                name,
                deadline,
                category,
                user_id,
                completed: false
            })
            .select()
            .single();

        if (error) {
            return {
                content: [{ type: "text", text: `Error adding task: ${error.message}` }],
                isError: true,
            };
        }

        return {
            content: [{ type: "text", text: `Task added successfully: ${data.name} (ID: ${data.id})` }],
        };
    }
);

// Tool: Complete Task
server.tool(
    "complete_task",
    "Mark a task as completed",
    {
        task_id: z.string().describe("The UUID of the task to complete"),
    },
    async ({ task_id }) => {
        const { data, error } = await supabase
            .from("tasks")
            .update({ completed: true, completed_at: new Date().toISOString() })
            .eq("id", task_id)
            .select()
            .single();

        if (error) {
            return {
                content: [{ type: "text", text: `Error completing task: ${error.message}` }],
                isError: true,
            };
        }

        return {
            content: [{ type: "text", text: `Task marked as completed: ${data.name}` }],
        };
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Compliance Companion MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main loop:", error);
    process.exit(1);
});
