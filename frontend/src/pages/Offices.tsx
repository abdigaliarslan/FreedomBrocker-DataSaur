import { useEffect, useState } from 'react';
import { Building2, MapPin, Route } from 'lucide-react';
import Header from '@/components/layout/Header';
import { fetchOffices } from '@/api/offices';
import type { Office } from '@/types/models';

export default function OfficesPage() {
    const [offices, setOffices] = useState<Office[]>([]);

    useEffect(() => {
        fetchOffices()
            .then(setOffices)
            .catch(console.error);
    }, []);

    const displayOffices = offices.length > 0 ? offices : [
        { name: 'Алматы — Головной офис', address: 'ул. Аль-Фараби 77/7, БЦ Esentai Tower', city: 'Алматы', manager_count: 12, active_tickets: 340, type: 'Головной' },
        { name: 'Астана — Центральный', address: 'пр. Мангилик Ел 55/20, БЦ EXPO', city: 'Астана', manager_count: 8, active_tickets: 230, type: 'Филиал' },
        { name: 'Шымкент', address: 'ул. Тауке хана 12, БЦ Forum', city: 'Шымкент', manager_count: 4, active_tickets: 120, type: 'Филиал' },
        { name: 'Караганда', address: 'ул. Бухар Жырау 45', city: 'Караганда', manager_count: 3, active_tickets: 85, type: 'Филиал' },
    ];

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Офисы" />
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <span className="text-[13px] text-muted-foreground font-medium">{displayOffices.length} офисов доступно</span>
                    <button className="bg-primary text-white px-5 py-2.5 rounded-lg text-[13px] font-bold shadow-md shadow-primary/20 hover:opacity-90">
                        + Добавить офис
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayOffices.map((o: any, i: number) => (
                        <div key={i} className="bg-white border border-border rounded-xl p-7 transition-all hover:shadow-lg group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-extrabold text-foreground leading-tight">{o.name}</h3>
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{o.type}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-start gap-2.5">
                                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                    <span className="text-[13px] font-medium text-foreground/80 leading-snug">{o.address}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Route className="w-4 h-4 text-primary shrink-0" />
                                    <span className="text-[13px] font-medium text-foreground/80">{o.city}, Казахстан</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-px bg-border/50 border border-border/50 rounded-xl overflow-hidden">
                                <div className="bg-background p-4 text-center">
                                    <div className="text-[18px] font-extrabold text-foreground">{o.manager_count}</div>
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Менеджеров</div>
                                </div>
                                <div className="bg-background p-4 text-center">
                                    <div className="text-[18px] font-extrabold text-foreground">{o.active_tickets}</div>
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Тикетов</div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                <span className="text-[12px] font-bold text-success capitalize">Активен</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
