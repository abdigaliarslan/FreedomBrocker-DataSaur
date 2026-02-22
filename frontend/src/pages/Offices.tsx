import { useEffect, useState, useMemo } from 'react';
import { Building2, MapPin, Navigation, Search, RotateCcw, Users } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { fetchOffices } from '@/api/offices';
import { fetchManagers } from '@/api/managers';
import type { Office, Manager } from '@/types/models';

export default function OfficesPage() {
    const [offices, setOffices] = useState<Office[]>([]);
    const [managers, setManagers] = useState<Manager[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [cityFilter, setCityFilter] = useState('');

    useEffect(() => {
        fetchOffices().then(setOffices).catch(console.error);
        fetchManagers().then(setManagers).catch(console.error);
    }, []);

    const managerCountByOffice = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const m of managers) {
            if (m.business_unit_id) {
                counts[m.business_unit_id] = (counts[m.business_unit_id] || 0) + 1;
            }
        }
        return counts;
    }, [managers]);

    const uniqueCities = useMemo(() => [...new Set(offices.map(o => o.city).filter(Boolean))].sort(), [offices]);

    const hasActiveFilters = !!cityFilter;

    const filtered = offices.filter(o => {
        if (searchValue) {
            const q = searchValue.toLowerCase();
            if (!o.name.toLowerCase().includes(q) && !o.city.toLowerCase().includes(q) && !(o.address || '').toLowerCase().includes(q)) return false;
        }
        if (cityFilter && o.city !== cityFilter) return false;
        return true;
    });

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Офисы" />
            <div className="p-8 space-y-6">
                {/* Search + Filters */}
                <div className="glass-card rounded-xl p-4 shadow-card space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[13px] text-muted-foreground font-medium shrink-0">
                            {filtered.length} из {offices.length} офисов
                        </span>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 min-w-[240px] transition-all">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Поиск офиса..."
                                value={searchValue}
                                onChange={e => setSearchValue(e.target.value)}
                                className="bg-transparent border-none outline-none text-[13px] w-full"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={cityFilter}
                            onChange={e => setCityFilter(e.target.value)}
                            className={cn(
                                "rounded-lg border px-3 py-2 text-[13px] font-medium bg-white outline-none cursor-pointer transition-all",
                                cityFilter ? "border-primary text-primary bg-primary/5" : "border-border text-foreground"
                            )}
                        >
                            <option value="">Все города</option>
                            {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {hasActiveFilters && (
                            <button
                                onClick={() => { setCityFilter(''); setSearchValue(''); }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Сбросить
                            </button>
                        )}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                        <Building2 className="w-10 h-10 opacity-30" />
                        <span className="text-[14px] font-medium">Нет данных</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                        {filtered.map((o, i) => (
                            <div key={o.id || i} className="glass-card rounded-xl p-7 transition-all hover:shadow-layered group animate-fade-in-up shadow-card">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-extrabold text-foreground leading-tight">{o.name}</h3>
                                        <span className="text-[12px] font-medium text-muted-foreground">{o.city}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    {o.address && (
                                        <div className="flex items-start gap-2.5">
                                            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                            <span className="text-[13px] font-medium text-foreground/80 leading-snug">{o.address}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2.5">
                                        <Navigation className="w-4 h-4 text-primary shrink-0" />
                                        <span className="text-[13px] font-medium text-foreground/80">{o.city}, Казахстан</span>
                                    </div>
                                </div>

                                {o.lat != null && o.lon != null && (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border border-border/50 text-[11px] font-mono text-muted-foreground mb-4">
                                        <Navigation className="w-3 h-3 text-primary" />
                                        {o.lat.toFixed(4)}, {o.lon.toFixed(4)}
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary" />
                                        <span className="text-[13px] font-bold text-foreground">{managerCountByOffice[o.id] || 0}</span>
                                        <span className="text-[12px] text-muted-foreground">менеджеров</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[11px] font-bold text-primary">Активен</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
