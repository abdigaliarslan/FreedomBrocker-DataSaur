import { useEffect, useState, useCallback } from 'react';
import { Filter, Search, ChevronLeft, ChevronRight, MoreVertical, Zap } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { fetchTickets } from '@/api/tickets';
import { useSSE } from '@/lib/useSSE';
import type { Ticket } from '@/types/models';

const STATUS_LABEL: Record<string, string> = {
    new: 'Новый',
    enriching: 'AI обрабатывает...',
    enriched: 'Обогащён',
    routed: 'Маршрутизирован',
    open: 'Открыт',
    progress: 'В работе',
    resolved: 'Решён',
};

const STATUS_STYLE: Record<string, string> = {
    new: 'bg-slate-100 text-slate-600',
    enriching: 'bg-blue-100 text-blue-700 animate-pulse',
    enriched: 'bg-cyan-100 text-cyan-700',
    routed: 'bg-purple-100 text-purple-700',
    open: 'bg-amber-100 text-amber-700',
    progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-success/10 text-success',
};

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [liveUpdated, setLiveUpdated] = useState<Set<string>>(new Set());

    const loadTickets = useCallback(() => {
        fetchTickets({ page: 1, per_page: 50 })
            .then((res: any) => setTickets(Array.isArray(res?.data) ? res.data : []))
            .catch(console.error);
    }, []);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    // SSE: live status updates
    useSSE((event) => {
        const { ticket_id, status } = event;

        setTickets(prev => {
            const exists = prev.find(t => (t as any).id === ticket_id);
            if (exists) {
                return prev.map(t =>
                    (t as any).id === ticket_id ? { ...t, status } : t
                );
            }
            // New ticket appeared — reload list
            loadTickets();
            return prev;
        });

        // Flash animation
        setLiveUpdated(prev => new Set(prev).add(ticket_id));
        setTimeout(() => {
            setLiveUpdated(prev => {
                const next = new Set(prev);
                next.delete(ticket_id);
                return next;
            });
        }, 2000);
    });

    const getStatusStyle = (status: string) =>
        STATUS_STYLE[status] ?? 'bg-muted text-muted-foreground';

    const getStatusLabel = (status: string) =>
        STATUS_LABEL[status] ?? status;

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-destructive';
            case 'medium': return 'text-amber-500';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Тикеты" />
            <div className="p-8 space-y-6">
                {/* Live indicator */}
                <div className="flex items-center gap-2 text-[12px] font-semibold text-primary">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Live — обновления в реальном времени
                </div>

                {/* Filters Toolbar */}
                <div className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-[13px] font-semibold hover:border-primary transition-all">
                            <Filter className="w-4 h-4" />
                            Фильтры
                        </button>
                        <div className="flex gap-1 bg-background p-1 rounded-lg border border-border">
                            {['Все', 'Новые', 'AI обработка', 'Маршрутизированы'].map((tab, i) => (
                                <button
                                    key={i}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-[13px] font-bold transition-all",
                                        i === 0 ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border focus-within:border-primary min-w-[280px]">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <input type="text" placeholder="Поиск по тикетам..." className="bg-transparent border-none outline-none text-[13px] w-full" />
                    </div>
                </div>

                {/* Tickets Table */}
                <div className="bg-white border border-border rounded-xl overflow-hidden shadow-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[hsl(var(--background))] border-b border-border">
                                <tr>
                                    <th className="w-12 px-6 py-4"><input type="checkbox" /></th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Тема тикета</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Статус</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Приоритет</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Менеджер</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Дата</th>
                                    <th className="px-6 py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center text-[13px] text-muted-foreground">
                                            Нет тикетов
                                        </td>
                                    </tr>
                                ) : tickets.map((t: any) => {
                                    const isLive = liveUpdated.has(t.id);
                                    return (
                                        <tr
                                            key={t.id}
                                            className={cn(
                                                "hover:bg-primary/5 transition-all cursor-pointer group",
                                                isLive && "bg-primary/10 scale-[1.001] shadow-sm"
                                            )}
                                            style={{ transition: 'background 0.4s ease, box-shadow 0.4s ease' }}
                                        >
                                            <td className="px-6 py-4">
                                                <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                                            </td>
                                            <td className="px-6 py-4 text-[12px] font-mono font-bold text-primary">
                                                {String(t.id).slice(0, 8)}…
                                                {isLive && <Zap className="inline w-3 h-3 ml-1 text-primary animate-bounce" />}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-foreground line-clamp-1">{t.subject || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-500",
                                                    getStatusStyle(t.status)
                                                )}>
                                                    {getStatusLabel(t.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", t.priority === 'high' ? 'bg-destructive' : 'bg-amber-500')} />
                                                    <span className={cn("text-[12px] font-bold", getPriorityStyle(t.priority))}>
                                                        {t.priority === 'high' ? 'Высокий' : t.priority === 'medium' ? 'Средний' : '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[13px] font-medium text-foreground">{t.manager_id || '—'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-[12px] text-muted-foreground font-medium">
                                                {t.created_at ? new Date(t.created_at).toLocaleDateString('ru-RU') : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-[hsl(var(--background))]">
                        <span className="text-[12px] text-muted-foreground">
                            Показано {tickets.length} тикетов
                        </span>
                        <div className="flex items-center gap-2">
                            <button className="p-2 border border-border rounded-lg text-muted-foreground hover:border-primary disabled:opacity-30">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-bold bg-primary text-white shadow-md shadow-primary/20">
                                1
                            </button>
                            <button className="p-2 border border-border rounded-lg text-muted-foreground hover:border-primary">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
