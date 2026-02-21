import { useEffect, useState } from 'react';
import { Ticket, Users, Building2, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { fetchStats } from '@/api/dashboard';
import type { DashboardStats } from '@/types/dashboard';

export default function DashboardPage() {
    const [statsData, setStatsData] = useState<DashboardStats | null>(null);

    useEffect(() => {
        fetchStats().then(setStatsData).catch(console.error);
    }, []);

    const stats = [
        {
            icon: Ticket,
            label: 'Всего тикетов',
            value: statsData?.total_tickets?.toLocaleString() || '0',
            change: `+${statsData?.tickets_change_pct || 0}%`,
            up: true,
            color: 'bg-[linear-gradient(135deg,#00C853,#00BFA5)]'
        },
        {
            icon: Users,
            label: 'Менеджеры',
            value: statsData?.active_managers?.toString() || '0',
            change: '',
            up: true,
            color: 'bg-[linear-gradient(135deg,#3B82F6,#2563EB)]'
        },
        {
            icon: Building2,
            label: 'Офисы',
            value: statsData?.total_offices?.toString() || '0',
            change: '',
            up: true,
            color: 'bg-[linear-gradient(135deg,#8B5CF6,#7C3AED)]'
        },
        {
            icon: Sparkles,
            label: 'AI-запросы',
            value: statsData?.ai_processed_count?.toLocaleString() || '0',
            change: '',
            up: true,
            color: 'bg-[linear-gradient(135deg,#F59E0B,#D97706)]'
        },
    ];

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Dashboard" />
            <div className="p-8 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {stats.map((s, i) => (
                        <div key={i} className="bg-white border border-border rounded-xl p-6 flex items-start gap-4 transition-all hover:shadow-md hover:-translate-y-0.5">
                            <div className={cn("w-12 h-12 min-w-[48px] rounded-lg flex items-center justify-center text-white", s.color)}>
                                <s.icon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[28px] font-extrabold text-foreground leading-tight">{s.value}</span>
                                <span className="text-[13px] text-muted-foreground font-medium mt-0.5">{s.label}</span>
                                <span className={cn(
                                    "text-[11px] font-bold mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                                    s.up ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"
                                )}>
                                    {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {s.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Recent Tickets Table */}
                    <div className="lg:col-span-2 bg-white border border-border rounded-xl overflow-hidden shadow-card">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <h3 className="text-base font-bold text-foreground">Последние тикеты</h3>
                            <button className="text-[13px] font-semibold text-muted-foreground hover:text-primary transition-colors">
                                Все тикеты →
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[hsl(var(--background))]">
                                    <tr>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Тема</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Статус</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Менеджер</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Дата</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-[13px] text-muted-foreground">Нет данных</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="bg-white border border-border rounded-xl p-6 shadow-card">
                        <h3 className="text-base font-bold text-foreground mb-6">Активность</h3>
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                            <span className="text-[13px] font-medium">Нет активности</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
