import { useEffect, useState } from 'react';
import { Filter, Search, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { fetchTickets } from '@/api/tickets';
import type { Ticket } from '@/types/models';

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);

    useEffect(() => {
        fetchTickets({ page: 1, per_page: 10 })
            .then((res: any) => setTickets(Array.isArray(res?.data) ? res.data : []))
            .catch(console.error);
    }, []);

    const displayTickets = tickets;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'resolved': return 'bg-success/10 text-success';
            case 'progress': return 'bg-blue-100 text-blue-700';
            case 'open': return 'bg-amber-100 text-amber-700';
            case 'routed': return 'bg-purple-100 text-purple-700';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-destructive';
            case 'medium': return 'text-amber-500';
            case 'low': return 'text-primary';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Тикеты" />
            <div className="p-8 space-y-6">
                {/* Filters Toolbar */}
                <div className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-[13px] font-semibold hover:border-primary transition-all">
                            <Filter className="w-4 h-4" />
                            Фильтры
                        </button>
                        <div className="flex gap-1 bg-background p-1 rounded-lg border border-border">
                            {['Все', 'Открытые', 'В работе', 'Решенные'].map((tab, i) => (
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
                                    <th className="w-12 px-6 py-4">
                                        <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Тема тикета</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Статус</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Приоритет</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Менеджер</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Дата создания</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {displayTickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center text-[13px] text-muted-foreground">Нет тикетов</td>
                                    </tr>
                                ) : displayTickets.map((t: any, i: number) => (
                                    <tr key={i} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4">
                                            <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                                        </td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-primary">{t.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-foreground">{t.subject}</span>
                                                <span className="text-[11px] text-muted-foreground">Клиент: Арман Бекбаев</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap", getStatusStyle(t.status))}>
                                                {t.status === 'open' ? 'Открыт' : t.status === 'progress' ? 'В работе' : t.status === 'resolved' ? 'Решен' : 'Маршрутизирован'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", t.priority === 'high' ? 'bg-destructive' : 'bg-amber-500')} />
                                                <span className={cn("text-[12px] font-bold", getPriorityStyle(t.priority))}>
                                                    {t.priority === 'high' ? 'Высокий' : 'Средний'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">АК</div>
                                                <span className="text-[13px] font-medium text-foreground">{t.manager_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[12px] text-muted-foreground font-medium">{t.created_at}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-[hsl(var(--background))]">
                        <span className="text-[12px] text-muted-foreground">
                            Показано 1-10 из 1,248 тикетов
                        </span>
                        <div className="flex items-center gap-2">
                            <button className="p-2 border border-border rounded-lg text-muted-foreground hover:border-primary disabled:opacity-30">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {[1, 2, 3, '...', 125].map((p, i) => (
                                <button
                                    key={i}
                                    className={cn(
                                        "w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all",
                                        p === 1 ? "bg-primary text-white shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-white hover:text-foreground border border-transparent hover:border-border"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
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
