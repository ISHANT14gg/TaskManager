import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { Loader2, PieChart as PieChartIcon, BarChart as BarChartIcon } from "lucide-react";

export function AnalyticsCharts() {
    const [loading, setLoading] = useState(true);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [statusData, setStatusData] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const { data: tasks, error } = await supabase
                .from("tasks")
                .select("category, completed");

            if (error) throw error;

            if (tasks) {
                // Process Category Data
                const catMap: Record<string, number> = {};
                tasks.forEach(t => {
                    const cat = t.category || "Uncategorized";
                    catMap[cat] = (catMap[cat] || 0) + 1;
                });
                const cData = Object.keys(catMap).map(key => ({
                    name: key,
                    value: catMap[key]
                }));
                setCategoryData(cData);

                // Process Status Data
                const pending = tasks.filter(t => !t.completed).length;
                const completed = tasks.filter(t => t.completed).length;
                setStatusData([
                    { name: "Pending", value: pending, fill: "hsl(var(--warning))" },
                    { name: "Completed", value: completed, fill: "hsl(var(--success))" } // You might need to define success color or use a static one
                ]);
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Category Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-primary" />
                        Task Distribution
                    </CardTitle>
                    <CardDescription>Breakdown by compliance category</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Status Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BarChartIcon className="h-5 w-5 text-primary" />
                        Completion Status
                    </CardTitle>
                    <CardDescription>Active vs Completed tasks</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? "#f59e0b" : "#22c55e"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
