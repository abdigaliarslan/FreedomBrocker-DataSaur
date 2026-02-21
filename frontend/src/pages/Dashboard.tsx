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
            value: statsData?.total_tickets.toLocaleString() || '1,248',
            change: `+${statsData?.tickets_change_pct || 12}%`,
            up: true,
            color: 'bg-[linear-gradient(135deg,#00C853,#00BFA5)]'
        },
        {
            icon: Users,
            label: 'Менеджеры',
            value: statsData?.active_managers.toString() || '32',
            change: '+3',
            up: true,
            color: 'bg-[linear-gradient(135deg,#3B82F6,#2563EB)]'
        },
        {
            icon: Building2,
            label: 'Офисы',
            value: statsData?.total_offices.toString() || '8',
            change: '0',
            up: true,
            color: 'bg-[linear-gradient(135deg,#8B5CF6,#7C3AED)]'
        },
        {
            icon: Sparkles,
            label: 'AI-запросы',
            value: statsData?.ai_processed_count.toLocaleString() || '3,456',
            change: '+28%',
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
                                    {[1, 2, 3, 4, 5].map((_, i) => (
                                        <tr key={i} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4 text-[13px] font-bold text-primary">TK-100{i + 1}</td>
                                            <td className="px-6 py-4 text-[13px] font-medium text-foreground">Проблема с доступом {i + 1}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                                                    В работе
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[13px] text-foreground font-medium">Алия К.</td>
                                            <td className="px-6 py-4 text-[12px] text-muted-foreground">21 фев</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="bg-white border border-border rounded-xl p-6 shadow-card">
                        <h3 className="text-base font-bold text-foreground mb-6">Активность</h3>
                        <div className="flex flex-col gap-5">
                            {[
                                { text: 'Новый тикет TK-1001 от клиента', time: '5 мин назад', color: 'bg-primary' },
                                { text: 'Алия К. взяла тикет TK-1002', time: '12 мин назад', color: 'bg-blue-500' },
                                { text: 'AI обработал 15 запросов', time: '30 мин назад', color: 'bg-accent' },
                                { text: 'Тикет TK-998 закрыт', time: '1 час назад', color: 'bg-primary' },
                                { text: 'Импортировано 230 записей', time: '2 часа назад', color: 'bg-blue-500' },
                            ].map((a, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className={cn("w-2 h-2 min-w-[8px] rounded-full mt-1.5", a.color)} />
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-medium text-foreground leading-snug">{a.text}</span>
                                        <span className="text-[11px] text-muted-foreground mt-0.5">{a.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
