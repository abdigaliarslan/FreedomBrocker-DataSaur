import { useEffect, useState } from 'react';
import { Star, MessageSquare, CheckCircle, Search, Filter } from 'lucide-react';
import Header from '@/components/layout/Header';
import { fetchManagers } from '@/api/managers';
import type { Manager } from '@/types/models';

export default function ManagersPage() {
    const [managers, setManagers] = useState<Manager[]>([]);

    useEffect(() => {
        fetchManagers()
            .then(setManagers)
            .catch(console.error);
    }, []);

    const displayManagers = managers.length > 0 ? managers : [
        { name: 'Алия Кузнецова', role: 'Chief Manager', tickets: 24, resolved: 145, rating: 4.9, avatar: 'АК' },
        { name: 'Данияр Омаров', role: 'Senior Manager', tickets: 18, resolved: 89, rating: 4.7, avatar: 'ДО' },
        { name: 'Мария Петрова', role: 'Junior Manager', tickets: 12, resolved: 34, rating: 4.5, avatar: 'МП' },
        { name: 'Иван Иванов', role: 'Manager', tickets: 21, resolved: 112, rating: 4.8, avatar: 'ИИ' },
        { name: 'Сауле Ибраева', role: 'Senior Manager', tickets: 15, resolved: 76, rating: 4.6, avatar: 'СИ' },
        { name: 'Виктор Цой', role: 'Manager', tickets: 7, resolved: 42, rating: 4.4, avatar: 'ВЦ' },
    ];

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Менеджеры" />
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <span className="text-[13px] text-muted-foreground font-medium">{displayManagers.length} менеджеров онлайн</span>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-border min-w-[240px]">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <input type="text" placeholder="Поиск менеджера..." className="bg-transparent border-none outline-none text-[13px] w-full" />
                        </div>
                        <button className="p-2.5 bg-white border border-border rounded-lg text-muted-foreground hover:border-primary">
                            <Filter className="w-4 h-4" />
                        </button>
                        <button className="bg-primary text-white px-5 py-2.5 rounded-lg text-[13px] font-bold shadow-md shadow-primary/20 hover:opacity-90">
                            + Добавить
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayManagers.map((m: any, i: number) => (
                        <div key={i} className="bg-white border border-border rounded-xl p-6 transition-all hover:shadow-lg group border-b-4 border-b-transparent hover:border-b-primary">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shadow-inner">
                                        {m.avatar}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-[15px] font-extrabold text-foreground group-hover:text-primary transition-colors">{m.name}</h3>
                                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{m.role}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                    <span className="text-[12px] font-extrabold text-amber-700">{m.rating}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-background rounded-xl p-4 border border-border/50">
                                    <div className="flex items-center gap-2 text-primary mb-1">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span className="text-[11px] font-bold uppercase tracking-tight">В работе</span>
                                    </div>
                                    <div className="text-[20px] font-extrabold text-foreground">{m.tickets}</div>
                                </div>
                                <div className="bg-background rounded-xl p-4 border border-border/50">
                                    <div className="flex items-center gap-2 text-success mb-1">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span className="text-[11px] font-bold uppercase tracking-tight">Решено</span>
                                    </div>
                                    <div className="text-[20px] font-extrabold text-foreground">{m.resolved}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(j => (
                                        <div key={j} className="w-7 h-7 rounded-full border-2 border-white bg-background flex items-center justify-center text-[10px] font-bold text-muted-foreground shadow-sm">
                                            #{j}
                                        </div>
                                    ))}
                                    <div className="w-7 h-7 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center text-[9px] font-bold shadow-sm">
                                        +5
                                    </div>
                                </div>
                                <button className="text-[12px] font-bold text-primary px-4 py-1.5 rounded-lg border border-primary/20 hover:bg-primary hover:text-white transition-all">
                                    Профиль
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
