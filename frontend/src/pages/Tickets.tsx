import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, MoreVertical, Zap, Sparkles, Eye, RefreshCw, CheckSquare, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Header from '@/components/layout/Header';
import TicketDetail from '@/components/TicketDetail';
import { cn } from '@/lib/utils';
import { fetchTickets, enrichTicket, enrichAllTickets } from '@/api/tickets';
import { useSSE } from '@/lib/useSSE';
import type { Ticket } from '@/types/models';
import type { Pagination } from '@/types/common';

const SEGMENT_TABS = [
    { label: 'Все клиенты', value: '' },
    { label: 'VIP', value: 'VIP' },
    { label: 'Priority', value: 'Priority' },
    { label: 'Mass', value: 'Mass' },
];

const SEGMENT_ORDER: Record<string, number> = { VIP: 0, Priority: 1, Mass: 2 };

const SEGMENT_BADGE: Record<string, string> = {
    VIP: 'bg-amber-100 text-amber-700',
    Priority: 'bg-purple-100 text-purple-700',
    Mass: 'bg-slate-100 text-slate-600',
};

const SEGMENT_ICON: Record<string, string> = {
    VIP: '👑',
    Priority: '⭐',
    Mass: '👤',
};

const SENTIMENT_TABS = [
    { label: 'Все', value: '' },
    { label: 'Позитивный', value: 'Позитивный' },
    { label: 'Негативный', value: 'Негативный' },
    { label: 'Нейтральный', value: 'Нейтральный' },
];

const TYPE_TABS = [
    { label: 'Все типы', value: '' },
    { label: 'Жалоба', value: 'Жалоба' },
    { label: 'Спам', value: 'Спам' },
    { label: 'Неработоспособность', value: 'Неработоспособность' },
    { label: 'Смена данных', value: 'Change Data' },
];

const STATUS_LABEL: Record<string, string> = {
    new: 'Новый', enriching: 'Анализируется', enriched: 'Обработан',
    routed: 'Маршрутизирован', open: 'Открыт', progress: 'В работе',
    resolved: 'Решён', closed: 'Закрыт',
};

const STATUS_STYLE: Record<string, string> = {
    new: 'bg-slate-100 text-slate-600',
    enriching: 'bg-blue-100 text-blue-700 animate-pulse',
    enriched: 'bg-cyan-100 text-cyan-700',
    routed: 'bg-purple-100 text-purple-700',
    open: 'bg-amber-100 text-amber-700',
    progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-100 text-gray-500',
};

function formatChannel(ch: string | null): string {
    if (!ch) return '—';
    const map: Record<string, string> = {
        email: 'Эл. почта', Email: 'Эл. почта',
        call: 'Телефон', phone: 'Телефон', Call: 'Телефон',
        web: 'Портал', Web: 'Портал', portal: 'Портал',
        chat: 'Чат', Chat: 'Чат',
    };
    return map[ch] || ch;
}

export default function TicketsPage() {
    const [searchParams] = useSearchParams();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [page, setPage] = useState(1);
    const [sentimentFilter, setSentimentFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [segmentFilter, setSegmentFilter] = useState('');
    const [segmentSort, setSegmentSort] = useState<'vip_first' | 'mass_first' | ''>('');
    const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchValue);
    const [liveUpdated, setLiveUpdated] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [openDetail, setOpenDetail] = useState<string | null>(null);
    const [dropdownId, setDropdownId] = useState<string | null>(null);
    const [enrichingBulk, setEnrichingBulk] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchValue), 300);
        return () => clearTimeout(t);
    }, [searchValue]);

    useEffect(() => { setPage(1); }, [sentimentFilter, typeFilter, segmentFilter, segmentSort, debouncedSearch]);

    const loadTickets = useCallback(() => {
        const params: Record<string, unknown> = { page, per_page: 20 };
        if (sentimentFilter) params.sentiment = sentimentFilter;
        if (typeFilter) params.type = typeFilter;
        if (segmentFilter) params.segment = segmentFilter;
        if (debouncedSearch) params.search = debouncedSearch;

        fetchTickets(params)
            .then((res: { data?: Ticket[]; pagination?: Pagination }) => {
                setTickets(Array.isArray(res?.data) ? res.data : []);
                if (res?.pagination) setPagination(res.pagination);
            })
            .catch(console.error);
    }, [page, sentimentFilter, typeFilter, segmentFilter, debouncedSearch]);

    useEffect(() => {
        loadTickets();
        const interval = setInterval(loadTickets, 10000);
        return () => clearInterval(interval);
    }, [loadTickets]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useSSE((event) => {
        const { ticket_id } = event;
        loadTickets();
        setLiveUpdated(prev => new Set(prev).add(ticket_id));
        setTimeout(() => {
            setLiveUpdated(prev => { const next = new Set(prev); next.delete(ticket_id); return next; });
        }, 2000);
    });

    const totalPages = pagination?.total_pages || 1;
    const totalItems = pagination?.total || tickets.length;

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === tickets.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(tickets.map(t => t.id)));
    };

    const handleBulkEnrich = async () => {
        setEnrichingBulk(true);
        try {
            if (selectedIds.size === tickets.length) await enrichAllTickets();
            else await Promise.all(Array.from(selectedIds).map(id => enrichTicket(id)));
            setSelectedIds(new Set());
            setTimeout(loadTickets, 1500);
        } catch { /* ignore */ }
        finally { setEnrichingBulk(false); }
    };

    const handleSingleEnrich = async (id: string) => {
        setDropdownId(null);
        try {
            await enrichTicket(id);
            setTimeout(loadTickets, 1500);
        } catch { /* ignore */ }
    };

    const sortedTickets = segmentSort
        ? [...tickets].sort((a, b) => {
            const ao = SEGMENT_ORDER[a.client_segment ?? ''] ?? 3;
            const bo = SEGMENT_ORDER[b.client_segment ?? ''] ?? 3;
            return segmentSort === 'vip_first' ? ao - bo : bo - ao;
        })
        : tickets;

    const cycleSegmentSort = () => {
        setSegmentSort(s => s === '' ? 'vip_first' : s === 'vip_first' ? 'mass_first' : '');
    };

    const pageNumbers = () => {
        const pages: number[] = [];
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages, page + 2);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Тикеты" />
            <div className="p-8 space-y-6">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-primary">
                    <span className="relative flex w-2 h-2">
                        <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full w-2 h-2 bg-primary" />
                    </span>
                    Live — обновления в реальном времени
                </div>

                {/* Filters Toolbar */}
                <div className="glass-card rounded-xl p-4 flex flex-col gap-3 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-1 bg-background p-1 rounded-lg border border-border">
                            {SENTIMENT_TABS.map(tab => (
                                <button
                                    key={tab.value}
                                    onClick={() => setSentimentFilter(tab.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-[12px] font-bold transition-all",
                                        sentimentFilter === tab.value
                                            ? "bg-white text-primary shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 min-w-[260px] transition-all">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Поиск по тикетам..."
                                value={searchValue}
                                onChange={e => setSearchValue(e.target.value)}
                                className="bg-transparent border-none outline-none text-[13px] w-full"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex gap-1 bg-background p-1 rounded-lg border border-border">
                            {TYPE_TABS.map(tab => (
                                <button
                                    key={tab.value}
                                    onClick={() => setTypeFilter(tab.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-[12px] font-bold transition-all",
                                        typeFilter === tab.value
                                            ? "bg-white text-primary shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1 bg-background p-1 rounded-lg border border-border">
                            {SEGMENT_TABS.map(tab => (
                                <button
                                    key={tab.value}
                                    onClick={() => setSegmentFilter(tab.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-[12px] font-bold transition-all",
                                        segmentFilter === tab.value
                                            ? "bg-white text-primary shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tickets Table */}
                <div className="glass-card rounded-xl overflow-hidden shadow-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[hsl(var(--background))] border-b border-border">
                                <tr>
                                    <th className="w-12 px-6 py-4">
                                        <input type="checkbox"
                                            checked={tickets.length > 0 && selectedIds.size === tickets.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-border text-primary focus:ring-primary"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Тема тикета</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Статус</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                        <button onClick={cycleSegmentSort} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                            Клиент
                                            {segmentSort === 'vip_first'
                                                ? <ArrowUp className="w-3.5 h-3.5 text-primary" />
                                                : segmentSort === 'mass_first'
                                                ? <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                                : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                                            }
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Канал</th>
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
                                ) : sortedTickets.map(t => {
                                    const isLive = liveUpdated.has(t.id);
                                    return (
                                        <tr
                                            key={t.id}
                                            className={cn(
                                                "hover:bg-primary/5 transition-all cursor-pointer group",
                                                isLive && "animate-flash"
                                            )}
                                            onClick={() => setOpenDetail(t.id)}
                                        >
                                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox"
                                                    checked={selectedIds.has(t.id)}
                                                    onChange={() => toggleSelect(t.id)}
                                                    className="rounded border-border text-primary focus:ring-primary"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-[12px] font-mono font-bold text-primary">
                                                {t.id.slice(0, 8)}…
                                                {isLive && <Zap className="inline w-3 h-3 ml-1 text-primary animate-bounce" />}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[13px] font-bold text-foreground line-clamp-1">{t.subject || '—'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap",
                                                    STATUS_STYLE[t.status] ?? 'bg-muted text-muted-foreground'
                                                )}>
                                                    {STATUS_LABEL[t.status] ?? t.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[13px] text-foreground/70">
                                                <span className="flex items-center gap-1.5">
                                                    {t.client_name || '—'}
                                                    {t.client_segment && (
                                                        <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold", SEGMENT_BADGE[t.client_segment] ?? 'bg-slate-100 text-slate-600')}>
                                                            {SEGMENT_ICON[t.client_segment] ?? ''} {t.client_segment}
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[12px] text-muted-foreground">
                                                {formatChannel(t.source_channel)}
                                            </td>
                                            <td className="px-6 py-4 text-[12px] text-muted-foreground font-medium">
                                                {t.created_at ? new Date(t.created_at).toLocaleDateString('ru-RU') : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right relative" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setDropdownId(dropdownId === t.id ? null : t.id)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                                {dropdownId === t.id && (
                                                    <div ref={dropdownRef} className="absolute right-6 top-12 bg-white border border-border rounded-xl shadow-layered-lg py-1 z-30 min-w-[180px] animate-fade-in">
                                                        <button onClick={() => { setOpenDetail(t.id); setDropdownId(null); }}
                                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-primary/5">
                                                            <Eye className="w-4 h-4 text-muted-foreground" /> Подробнее
                                                        </button>
                                                        <button onClick={() => handleSingleEnrich(t.id)}
                                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-primary/5">
                                                            <Sparkles className="w-4 h-4 text-muted-foreground" /> AI анализ
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-[hsl(var(--background))]">
                        <span className="text-[12px] text-muted-foreground">
                            Показано {tickets.length} из {totalItems} | Страница {page} из {totalPages}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 border border-border rounded-lg text-muted-foreground hover:border-primary disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {pageNumbers().map(n => (
                                <button
                                    key={n}
                                    onClick={() => setPage(n)}
                                    className={cn(
                                        "w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all",
                                        n === page
                                            ? "bg-primary text-white shadow-md shadow-primary/20"
                                            : "text-muted-foreground hover:bg-background border border-border"
                                    )}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 border border-border rounded-lg text-muted-foreground hover:border-primary disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {selectedIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-white rounded-2xl shadow-layered-lg px-6 py-3.5 flex items-center gap-4 z-40 animate-fade-in-up">
                        <CheckSquare className="w-5 h-5" />
                        <span className="text-[13px] font-bold">Выбрано: {selectedIds.size}</span>
                        <button
                            onClick={handleBulkEnrich}
                            disabled={enrichingBulk}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[13px] font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
                        >
                            {enrichingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {enrichingBulk ? 'Анализ...' : `AI анализ (${selectedIds.size})`}
                        </button>
                        <button onClick={() => setSelectedIds(new Set())}
                            className="text-[12px] text-white/60 hover:text-white font-medium transition-colors">
                            Снять выделение
                        </button>
                    </div>
                )}
            </div>

            {openDetail && (
                <TicketDetail
                    ticketId={openDetail}
                    onClose={() => setOpenDetail(null)}
                    onChanged={loadTickets}
                />
            )}
        </div>
    );
}
