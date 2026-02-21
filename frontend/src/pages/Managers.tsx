import { useEffect, useState } from 'react';
import { Search, Users, Globe, X, Briefcase, Mail, Building2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { fetchManagers } from '@/api/managers';
import type { Manager } from '@/types/models';

export default function ManagersPage() {
    const [managers, setManagers] = useState<Manager[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [selectedManager, setSelectedManager] = useState<Manager | null>(null);

    useEffect(() => {
        fetchManagers().then(setManagers).catch(console.error);
    }, []);

    const filtered = managers.filter(m => {
        if (!searchValue) return true;
        const q = searchValue.toLowerCase();
        return m.full_name.toLowerCase().includes(q) || m.office_name?.toLowerCase().includes(q) || m.office_city?.toLowerCase().includes(q);
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
                <div className="flex items-center justify-between">
                    <span className="text-[13px] text-muted-foreground font-medium">
                        {filtered.length} менеджеров {managers.filter(m => m.is_active).length > 0 && `(${managers.filter(m => m.is_active).length} активных)`}
                    </span>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 min-w-[240px] transition-all">
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
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-700", getUtilColor(m.utilization_pct))}
                                            style={{ width: `${Math.min(m.utilization_pct, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end">
                                    <button
                                        onClick={() => setSelectedManager(m)}
                                        className="text-[12px] font-bold text-primary px-4 py-1.5 rounded-lg border border-primary/20 hover:bg-primary hover:text-white transition-all"
                                    >
                                        Профиль
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedManager && (
                <>
                    <div className="slideover-overlay" onClick={() => setSelectedManager(null)} />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-layered-lg max-w-md w-full p-8 animate-fade-in-up relative">
                            <button onClick={() => setSelectedManager(null)}
                                className="absolute right-4 top-4 p-2 rounded-lg hover:bg-background transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>

                            <div className="flex items-center gap-4 mb-6">
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

                            <div className="mt-6 p-4 bg-background rounded-xl border border-border">
                                <div className="flex items-center justify-between text-[12px] mb-2">
                                    <span className="font-bold text-muted-foreground">Утилизация</span>
                                    <span className="font-bold text-foreground">{selectedManager.utilization_pct}%</span>
                                </div>
                                <div className="h-3 bg-white rounded-full overflow-hidden border border-border/50">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-700", getUtilColor(selectedManager.utilization_pct))}
                                        style={{ width: `${Math.min(selectedManager.utilization_pct, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="mt-4 text-[11px] text-muted-foreground">
                                <p>ID: <span className="font-mono">{selectedManager.id}</span></p>
                                <p>Создан: {new Date(selectedManager.created_at).toLocaleDateString('ru-RU')}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
