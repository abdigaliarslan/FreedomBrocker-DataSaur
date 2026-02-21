import { useEffect, useState } from 'react';
import { Building2, MapPin, Navigation } from 'lucide-react';
import Header from '@/components/layout/Header';
import { fetchOffices } from '@/api/offices';
import type { Office } from '@/types/models';

export default function OfficesPage() {
    const [offices, setOffices] = useState<Office[]>([]);

    useEffect(() => {
        fetchOffices().then(setOffices).catch(console.error);
    }, []);

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Офисы" />
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <span className="text-[13px] text-muted-foreground font-medium">{offices.length} офисов</span>
                </div>

                {offices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                        <Building2 className="w-10 h-10 opacity-30" />
                        <span className="text-[14px] font-medium">Нет данных</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                        {offices.map((o, i) => (
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

                                <div className="flex items-center gap-2 pt-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[12px] font-bold text-primary">Активен</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
