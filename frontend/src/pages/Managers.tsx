import { useEffect, useState, useMemo } from 'react';
import { Search, Users, Globe, X, Briefcase, Mail, Building2, RotateCcw, ArrowUpDown, Ticket, ExternalLink } from 'lucide-react';
import Header from '@/components/layout/Header';
import TicketDetail from '@/components/TicketDetail';
import { cn } from '@/lib/utils';
import { fetchManagers, fetchManagerTickets } from '@/api/managers';
import type { Manager, Ticket as TicketType } from '@/types/models';

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
const STATUS_LABEL: Record<string, string> = {
    new: 'Новый', enriching: 'Анализируется', enriched: 'Обработан',
    routed: 'Маршрутизирован', open: 'Открыт', progress: 'В работе',
    resolved: 'Решён', closed: 'Закрыт',
};

export default function ManagersPage() {
    const [managers, setManagers] = useState<Manager[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [langFilter, setLangFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [loadFilter, setLoadFilter] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
    const [managerTickets, setManagerTickets] = useState<TicketType[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [openTicketId, setOpenTicketId] = useState<string | null>(null);

    useEffect(() => {
        fetchManagers().then(setManagers).catch(console.error);
    }, []);

    useEffect(() => {
        const load = async () => {
            if (!selectedManager) {
                setManagerTickets([]);
                return;
            }
            setTicketsLoading(true);
            try {
                const tickets = await fetchManagerTickets(selectedManager.id);
                setManagerTickets(tickets);
            } catch (e) {
                console.error(e);
            } finally {
                setTicketsLoading(false);
            }
        };
        load();
    }, [selectedManager]);

    const uniqueCities = useMemo(() => [...new Set(managers.map(m => m.office_city).filter(Boolean))].sort(), [managers]);
    const uniqueLangs = useMemo(() => [...new Set(managers.flatMap(m => m.languages || []))].sort(), [managers]);

    const hasActiveFilters = cityFilter || langFilter || roleFilter || loadFilter;

    const resetFilters = () => {
        setCityFilter(''); setLangFilter(''); setRoleFilter(''); setLoadFilter(''); setSearchValue('');
    };

    const filtered = managers.filter(m => {
        if (searchValue) {
            const q = searchValue.toLowerCase();
            if (!m.full_name.toLowerCase().includes(q) && !m.office_name?.toLowerCase().includes(q) && !m.office_city?.toLowerCase().includes(q)) return false;
        }
        if (cityFilter && m.office_city !== cityFilter) return false;
        if (langFilter && !m.languages?.includes(langFilter)) return false;
        if (roleFilter === 'vip' && !m.is_vip_skill) return false;
        if (roleFilter === 'chief' && !m.is_chief_spec) return false;
        if (roleFilter === 'regular' && (m.is_vip_skill || m.is_chief_spec)) return false;
        if (loadFilter === 'low' && m.utilization_pct >= 50) return false;
        if (loadFilter === 'mid' && (m.utilization_pct < 50 || m.utilization_pct > 80)) return false;
        if (loadFilter === 'high' && m.utilization_pct <= 80) return false;
        return true;
    }).sort((a, b) => {
        if (sortBy === 'load_asc') return a.utilization_pct - b.utilization_pct;
        if (sortBy === 'load_desc') return b.utilization_pct - a.utilization_pct;
        if (sortBy === 'city') return (a.office_city || '').localeCompare(b.office_city || '');
        return a.full_name.localeCompare(b.full_name);
    });

    const getRole = (m: Manager) => {
        if (m.is_chief_spec) return 'Главный специалист';
        if (m.is_vip_skill) return 'VIP менеджер';
        return 'Менеджер';
    };

    const getRoleBadge = (m: Manager) => {
        if (m.is_chief_spec) return 'bg-purple-100 text-purple-700';
        if (m.is_vip_skill) return 'bg-amber-100 text-amber-700';
        return 'bg-slate-100 text-slate-600';
    };

    const getUtilColor = (pct: number) => {
        if (pct > 80) return 'bg-red-500';
        if (pct > 50) return 'bg-amber-500';
        return 'bg-primary';
    };

    const initials = (name: string) => {
        const parts = name.split(' ');
        return parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Менеджеры" />
            <div className="p-8 space-y-6">
                {/* Search + Filters */}
                <div className="glass-card rounded-xl p-4 shadow-card space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[13px] text-muted-foreground font-medium shrink-0">
                            {filtered.length} из {managers.length} менеджеров
                        </span>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 min-w-[240px] transition-all">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Поиск менеджера..."
                                value={searchValue}
                                onChange={e => setSearchValue(e.target.value)}
                                className="bg-transparent border-none outline-none text-[13px] w-full"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                            className={cn("rounded-lg border px-3 py-2 text-[13px] font-medium bg-white outline-none cursor-pointer transition-all",
                                cityFilter ? "border-primary text-primary bg-primary/5" : "border-border text-foreground")}>
                            <option value="">Все города</option>
                            {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={langFilter} onChange={e => setLangFilter(e.target.value)}
                            className={cn("rounded-lg border px-3 py-2 text-[13px] font-medium bg-white outline-none cursor-pointer transition-all",
                                langFilter ? "border-primary text-primary bg-primary/5" : "border-border text-foreground")}>
                            <option value="">Все языки</option>
                            {uniqueLangs.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                            className={cn("rounded-lg border px-3 py-2 text-[13px] font-medium bg-white outline-none cursor-pointer transition-all",
                                roleFilter ? "border-primary text-primary bg-primary/5" : "border-border text-foreground")}>
                            <option value="">Все роли</option>
                            <option value="regular">Менеджер</option>
                            <option value="vip">VIP менеджер</option>
                            <option value="chief">Главный специалист</option>
                        </select>
                        <select value={loadFilter} onChange={e => setLoadFilter(e.target.value)}
                            className={cn("rounded-lg border px-3 py-2 text-[13px] font-medium bg-white outline-none cursor-pointer transition-all",
                                loadFilter ? "border-primary text-primary bg-primary/5" : "border-border text-foreground")}>
                            <option value="">Любая нагрузка</option>
                            <option value="low">Свободен (&lt; 50%)</option>
                            <option value="mid">Средняя (50-80%)</option>
                            <option value="high">Высокая (&gt; 80%)</option>
                        </select>
                        <div className="flex items-center gap-1.5 ml-auto">
                            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                className="rounded-lg border border-border px-3 py-2 text-[13px] font-medium bg-white outline-none cursor-pointer transition-all">
                                <option value="name">По имени</option>
                                <option value="load_desc">Нагрузка ↓</option>
                                <option value="load_asc">Нагрузка ↑</option>
                                <option value="city">По городу</option>
                            </select>
                        </div>
                        {hasActiveFilters && (
                            <button onClick={resetFilters}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-muted-foreground hover:text-destructive transition-colors">
                                <RotateCcw className="w-3.5 h-3.5" /> Сбросить
                            </button>
                        )}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                        <Users className="w-10 h-10 opacity-30" />
                        <span className="text-[14px] font-medium">Нет данных</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                        {filtered.map((m, i) => (
                            <div key={m.id || i} className="glass-card rounded-xl p-6 transition-all hover:shadow-layered group border-b-4 border-b-transparent hover:border-b-primary animate-fade-in-up shadow-card">
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shadow-inner">
                                            {initials(m.full_name)}
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="text-[15px] font-extrabold text-foreground group-hover:text-primary transition-colors">{m.full_name}</h3>
                                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block w-fit", getRoleBadge(m))}>
                                                {getRole(m)}
                                            </span>
                                        </div>
                                    </div>
                                    {m.is_active && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            <span className="text-[10px] font-bold text-primary uppercase">Online</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-4">
                                    <Building2 className="w-3.5 h-3.5 text-primary" />
                                    <span>{m.office_name}, {m.office_city}</span>
                                </div>

                                {m.languages && m.languages.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {m.languages.map((lang, j) => (
                                            <span key={j} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                                                <Globe className="w-2.5 h-2.5" /> {lang}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="mb-5">
                                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                                        <span className="text-muted-foreground font-bold uppercase tracking-tight">Нагрузка</span>
                                        <span className="font-bold text-foreground">{m.current_load}/{m.max_load} ({m.utilization_pct}%)</span>
                                    </div>
                                    <div className="h-2 bg-background rounded-full overflow-hidden border border-border/50">
                                        <div className={cn("h-full rounded-full transition-all duration-700", getUtilColor(m.utilization_pct))}
                                            style={{ width: `${Math.min(m.utilization_pct, 100)}%` }} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end">
                                    <button onClick={() => setSelectedManager(m)}
                                        className="text-[12px] font-bold text-primary px-4 py-1.5 rounded-lg border border-primary/20 hover:bg-primary hover:text-white transition-all">
                                        Профиль
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Manager profile modal */}
            {selectedManager && (
                <>
                    <div className="slideover-overlay" onClick={() => setSelectedManager(null)} />
                    <div className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-white z-50 shadow-layered-lg overflow-y-auto scrollbar-thin animate-slide-in-right flex flex-col">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-[15px] font-bold text-foreground">Профиль менеджера</h2>
                            <button onClick={() => setSelectedManager(null)}
                                className="p-2 rounded-lg hover:bg-background transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="flex-1 p-6 space-y-6">
                            {/* Avatar + name */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                                    {initials(selectedManager.full_name)}
                                </div>
                                <div>
                                    <h3 className="text-[18px] font-extrabold text-foreground">{selectedManager.full_name}</h3>
                                    <span className={cn("text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block mt-1", getRoleBadge(selectedManager))}>
                                        {getRole(selectedManager)}
                                    </span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="space-y-3">
                                {selectedManager.email && (
                                    <div className="flex items-center gap-3 text-[13px]">
                                        <Mail className="w-4 h-4 text-primary" />
                                        <span className="text-foreground">{selectedManager.email}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-[13px]">
                                    <Building2 className="w-4 h-4 text-primary" />
                                    <span className="text-foreground">{selectedManager.office_name}, {selectedManager.office_city}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[13px]">
                                    <Briefcase className="w-4 h-4 text-primary" />
                                    <span className="text-foreground">Нагрузка: {selectedManager.current_load}/{selectedManager.max_load}</span>
                                </div>
                                {selectedManager.languages && selectedManager.languages.length > 0 && (
                                    <div className="flex items-center gap-3 text-[13px]">
                                        <Globe className="w-4 h-4 text-primary" />
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedManager.languages.map((lang, j) => (
                                                <span key={j} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">{lang}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Utilization */}
                            <div className="p-4 bg-background rounded-xl border border-border">
                                <div className="flex items-center justify-between text-[12px] mb-2">
                                    <span className="font-bold text-muted-foreground">Утилизация</span>
                                    <span className="font-bold text-foreground">{selectedManager.utilization_pct}%</span>
                                </div>
                                <div className="h-3 bg-white rounded-full overflow-hidden border border-border/50">
                                    <div className={cn("h-full rounded-full transition-all duration-700", getUtilColor(selectedManager.utilization_pct))}
                                        style={{ width: `${Math.min(selectedManager.utilization_pct, 100)}%` }} />
                                </div>
                            </div>

                            {/* Tickets */}
                            <div>
                                <div className="flex items-center gap-2 text-[13px] font-bold text-foreground mb-3">
                                    <Ticket className="w-4 h-4 text-primary" />
                                    Тикеты менеджера
                                    {managerTickets.length > 0 && (
                                        <span className="ml-auto text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                            {managerTickets.length}
                                        </span>
                                    )}
                                </div>
                                {ticketsLoading ? (
                                    <p className="text-[12px] text-muted-foreground py-4 text-center">Загрузка...</p>
                                ) : managerTickets.length === 0 ? (
                                    <p className="text-[12px] text-muted-foreground py-4 text-center">Нет назначенных тикетов</p>
                                ) : (
                                    <div className="space-y-2">
                                        {managerTickets.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setOpenTicketId(t.id)}
                                                className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-bold text-foreground line-clamp-1 group-hover:text-primary">
                                                        {t.subject || '—'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_STYLE[t.status] ?? 'bg-muted text-muted-foreground')}>
                                                            {STATUS_LABEL[t.status] ?? t.status}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {new Date(t.created_at).toLocaleDateString('ru-RU')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Meta */}
                            <div className="text-[11px] text-muted-foreground space-y-1 pt-4 border-t border-border">
                                <p>ID: <span className="font-mono">{selectedManager.id}</span></p>
                                <p>Создан: {new Date(selectedManager.created_at).toLocaleDateString('ru-RU')}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Ticket detail from manager profile */}
            {openTicketId && (
                <TicketDetail
                    ticketId={openTicketId}
                    onClose={() => setOpenTicketId(null)}
                />
            )}
        </div>
    );
}
