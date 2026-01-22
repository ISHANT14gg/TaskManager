import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

// Setup localizer
const localizer = momentLocalizer(moment);

type Task = Database['public']['Tables']['tasks']['Row'];

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource: Task;
}

export function CalendarView() {
    const { profile } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) {
            fetchTasks();
        }
    }, [profile]);

    const fetchTasks = async () => {
        if (!profile) return;
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('organization_id', profile.organization_id); // 🛡️ Org isolation

            if (error) throw error;

            if (data) {
                const formattedEvents: CalendarEvent[] = data.map(task => ({
                    id: task.id,
                    title: task.name,
                    start: new Date(task.deadline),
                    end: new Date(task.deadline),
                    allDay: true,
                    resource: task
                }));
                setEvents(formattedEvents);
            }
        } catch (error) {
            console.error('Error fetching tasks for calendar:', error);
        } finally {
            setLoading(false);
        }
    };

    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = 'hsl(var(--primary))';
        const category = event.resource.category.toLowerCase();

        if (category === 'gst') backgroundColor = 'hsl(var(--gst))';
        else if (category === 'income tax') backgroundColor = 'hsl(var(--income-tax))';
        else if (category === 'insurance') backgroundColor = 'hsl(var(--insurance))';
        else if (category === 'transport') backgroundColor = 'hsl(var(--transport))';

        if (event.resource.completed) {
            backgroundColor = 'hsl(var(--muted-foreground))';
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <Card className="h-[800px] border-none shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Compliance Calendar
                </CardTitle>
            </CardHeader>
            <CardContent className="h-full">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%', minHeight: '600px' }}
                    eventPropGetter={eventStyleGetter}
                    views={['month', 'agenda']}
                    defaultView='month'
                    className="text-inherit"
                    tooltipAccessor={event => `${event.title} (${event.resource.category})`}
                />
            </CardContent>
        </Card>
    );
}
