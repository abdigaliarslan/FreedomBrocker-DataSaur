import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Users, Building2, Sparkles, TrendingUp, TrendingDown, Activity, Clock, ArrowRight, Crown, MapPinOff, Zap } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { fetchStats, fetchSentiment, fetchTimeline, fetchCategories, fetchManagerLoad } from '@/api/dashboard';
import { fetchTickets } from '@/api/tickets';
import { useSSE, type SSETicketEvent } from '@/lib/useSSE';
import type { DashboardStats, SentimentData, TimelineData, CategoryData, ManagerLoadData } from '@/types/dashboard';
import type { Ticket as TicketType } from '@/types/models';
import DonutChart from '@/components/charts/DonutChart';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';

const STATUS_LABEL: Record<string, string> = {
    new: 'Новый', enriching: 'AI обработка', enriched: 'Обогащён',
    routed: 'Маршрутизирован', open: 'Открыт', progress: 'В работе', resolved: 'Решён', closed: 'Закрыт',
};

const STATUS_STYLE: Record<string, string> = {
    new: 'bg-slate-100 text-slate-600',
    enriching: 'bg-blue-100 text-blue-700',
    enriched: 'bg-cyan-100 text-cyan-700',
    routed: 'bg-purple-100 text-purple-700',
    open: 'bg-amber-100 text-amber-700',
    progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-100 text-gray-500',
};

const SENTIMENT_COLORS: Record<string, string> = {
    'Позитивный': '#10b981',
    'Негативный': '#ef4444',
    'Нейтральный': '#3b82f6',
};

export default function DashboardPage() {
    const [statsData, setStatsData] = useState<DashboardStats | null>(null);
    const [recentTickets, setRecentTickets] = useState<TicketType[]>([]);
    const [sentiment, setSentiment] = useState<SentimentData[]>([]);
    const [timeline, setTimeline] = useState<TimelineData[]>([]);
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [managerLoad, setManagerLoad] = useState<ManagerLoadData[]>([]);
    const [sseEvents, setSSEEvents] = useState<SSETicketEvent[]>([]);

    const loadAll = useCallback(() => {
        fetchStats().then(setStatsData).catch(console.error);
        fetchTickets({ page: 1, per_page: 5 })
            .then((res: { data?: TicketType[] }) => setRecentTickets(Array.isArray(res?.data) ? res.data : []))
            .catch(console.error);
        fetchSentiment().then(setSentiment).catch(console.error);
        fetchTimeline().then(setTimeline).catch(console.error);
        fetchCategories().then(setCategories).catch(console.error);
        fetchManagerLoad().then(setManagerLoad).catch(console.error);
    }, []);

    useEffect(() => {
        loadAll();
        const interval = setInterval(loadAll, 15000);
        return () => clearInterval(interval);
    }, [loadAll]);

    useSSE((event) => {
        setSSEEvents(prev => [event, ...prev].slice(0, 20));
        loadAll();
    });

    const stats = [
        {
            icon: Ticket, label: 'Всего тикетов',
            value: statsData?.total_tickets?.toLocaleString() || '0',
            change: `+${statsData?.tickets_change_pct || 0}%`, up: true,
            color: 'bg-[linear-gradient(135deg,#00C853,#00BFA5)]',
            subStats: statsData ? [
                { label: 'В ожидании', value: statsData.pending_tickets },
                { label: 'Маршрутизировано', value: statsData.routed_tickets },
            ] : undefined,
        },
        {
            icon: Users, label: 'Менеджеры',
            value: statsData?.active_managers?.toString() || '0',
            change: '', up: true,
            color: 'bg-[linear-gradient(135deg,#3B82F6,#2563EB)]',
        },
        {
            icon: Building2, label: 'Офисы',
            value: statsData?.total_offices?.toString() || '0',
            change: '', up: true,
            color: 'bg-[linear-gradient(135deg,#8B5CF6,#7C3AED)]',
        },
        {
            icon: Sparkles, label: 'AI-запросы',
            value: statsData?.ai_processed_count?.toLocaleString() || '0',
            change: '', up: true,
            color: 'bg-[linear-gradient(135deg,#F59E0B,#D97706)]',
        },
        {
            icon: Crown, label: 'VIP обращения',
            value: statsData?.vip_count?.toString() || '0',
            change: '', up: true,
            color: 'bg-[linear-gradient(135deg,#F59E0B,#D97706)]',
        },
        {
            icon: MapPinOff, label: 'Без геолокации',
            value: statsData?.unknown_geo_count?.toString() || '0',
            change: '', up: true,
            color: 'bg-[linear-gradient(135deg,#EF4444,#DC2626)]',
        },
        {
            icon: Zap, label: 'Скорость AI',
            value: statsData?.avg_processing_ms
                ? statsData.avg_processing_ms < 1000
                    ? `${Math.round(statsData.avg_processing_ms)}ms`
                    : `${(statsData.avg_processing_ms / 1000).toFixed(1)}s`
                : '—',
            change: statsData?.avg_processing_ms && statsData.avg_processing_ms < 1000 ? 'Отлично' : '',
            up: true,
            color: 'bg-[linear-gradient(135deg,#06B6D4,#0891B2)]',
        },
    ];

    const sentimentChartData = sentiment.map(s => ({
        label: s.sentiment,
        value: s.count,
        color: SENTIMENT_COLORS[s.sentiment] || '#94a3b8',
    }));

    const timelineChartData = timeline.map(t => ({
        label: t.date.slice(5),
        value: t.count,
    }));

    const categoryChartData = categories.map(c => ({
        label: c.type || 'Другое',
        value: c.count,
        color: '#00C853',
    }));

    const loadChartData = managerLoad.slice(0, 8).map(m => ({
        label: m.manager_name?.split(' ')[0] || '?',
        value: m.utilization_pct,
        color: m.utilization_pct > 80 ? '#ef4444' : m.utilization_pct > 50 ? '#f59e0b' : '#00C853',
    }));

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Dashboard" />
            <div className="p-8 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
                    {stats.map((s, i) => (
                        <div key={i} className="glass-card rounded-xl p-6 flex items-start gap-4 transition-all hover:shadow-layered hover:-translate-y-0.5 animate-fade-in-up shadow-card">
                            <div className={cn("w-12 h-12 min-w-[48px] rounded-lg flex items-center justify-center text-white", s.color)}>
                                <s.icon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className="text-[28px] font-extrabold text-foreground leading-tight animate-count-up">{s.value}</span>
                                <span className="text-[13px] text-muted-foreground font-medium mt-0.5">{s.label}</span>
                                {s.change && (
                                    <span className={cn(
                                        "text-[11px] font-bold mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full w-fit",
                                        s.up ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"
                                    )}>
                                        {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {s.change}
                                    </span>
                                )}
                                {s.subStats && (
                                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                                        {s.subStats.map((sub, j) => (
                                            <div key={j} className="text-[11px]">
                                                <span className="text-muted-foreground">{sub.label}: </span>
                                                <span className="font-bold text-foreground">{sub.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="glass-card rounded-xl p-6 shadow-card animate-fade-in-up">
                        <h3 className="text-[14px] font-bold text-foreground mb-5">Тональность обращений</h3>
                        {sentimentChartData.length > 0
                            ? <DonutChart data={sentimentChartData} />
                            : <p className="text-[13px] text-muted-foreground text-center py-8">Нет данных</p>
                        }
                    </div>

                    <div className="glass-card rounded-xl p-6 shadow-card animate-fade-in-up">
                        <h3 className="text-[14px] font-bold text-foreground mb-5">Динамика тикетов</h3>
                        <LineChart data={timelineChartData} />
                    </div>

                    <div className="glass-card rounded-xl p-6 shadow-card animate-fade-in-up">
                        <h3 className="text-[14px] font-bold text-foreground mb-5">Категории обращений</h3>
                        {categoryChartData.length > 0
                            ? <BarChart data={categoryChartData} />
                            : <p className="text-[13px] text-muted-foreground text-center py-8">Нет данных</p>
                        }
                    </div>

                    <div className="glass-card rounded-xl p-6 shadow-card animate-fade-in-up">
                        <h3 className="text-[14px] font-bold text-foreground mb-5">Нагрузка менеджеров</h3>
                        {loadChartData.length > 0
                            ? <BarChart data={loadChartData} maxValue={100} />
                            : <p className="text-[13px] text-muted-foreground text-center py-8">Нет данных</p>
                        }
                    </div>
                </div>

                {/* Main Grid: Recent Tickets + Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden shadow-card animate-fade-in-up">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <h3 className="text-base font-bold text-foreground">Последние тикеты</h3>
                            <Link to="/tickets" className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors">
                                Все тикеты <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[hsl(var(--background))]">
                                    <tr>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Тема</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Статус</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Клиент</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Дата</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {recentTickets.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-[13px] text-muted-foreground">Нет данных</td>
                                        </tr>
                                    ) : recentTickets.map(t => (
                                        <tr key={t.id} className="hover:bg-primary/5 transition-colors">
                                            <td className="px-6 py-3.5 text-[12px] font-mono font-bold text-primary">{t.id.slice(0, 8)}…</td>
                                            <td className="px-6 py-3.5 text-[13px] font-medium text-foreground max-w-[240px] truncate">{t.subject || '—'}</td>
                                            <td className="px-6 py-3.5">
                                                <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold", STATUS_STYLE[t.status] || 'bg-muted text-muted-foreground')}>
                                                    {STATUS_LABEL[t.status] || t.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-[13px] text-foreground/70">{t.client_name || '—'}</td>
                                            <td className="px-6 py-3.5 text-[12px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('ru-RU')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="glass-card rounded-xl p-6 shadow-card animate-fade-in-up">
                        <div className="flex items-center gap-2 mb-5">
                            <Activity className="w-4 h-4 text-primary" />
                            <h3 className="text-base font-bold text-foreground">Активность</h3>
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse ml-auto" />
                        </div>
                        {sseEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-[13px] text-muted-foreground gap-2">
                                <Clock className="w-6 h-6 opacity-30" />
                                Ожидание событий...
                            </div>
                        ) : (
                            <div className="space-y-0 max-h-[400px] overflow-y-auto scrollbar-thin">
                                {sseEvents.map((ev, i) => (
                                    <div key={i} className={cn("flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-background", i === 0 && "animate-slide-in")}>
                                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-foreground truncate">{ev.ticket_id?.slice(0, 8)}…</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {STATUS_LABEL[ev.status] || ev.status}
                                                {ev.manager && ` → ${ev.manager}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
