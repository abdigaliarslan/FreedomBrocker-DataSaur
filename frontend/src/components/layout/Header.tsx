import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Zap, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSSE, type SSETicketEvent } from '@/lib/useSSE';

interface HeaderProps {
    title: string;
    breadcrumb?: string;
}

interface TimedEvent extends SSETicketEvent {
    time: string;
}

export default function Header({ title, breadcrumb }: HeaderProps) {
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [events, setEvents] = useState<TimedEvent[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useSSE((event) => {
        const now = new Date();
        const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        setEvents(prev => [{ ...event, time }, ...prev].slice(0, 20));
    });

    const handleSearchSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchValue.trim()) {
            navigate(`/tickets?search=${encodeURIComponent(searchValue.trim())}`);
            setSearchValue('');
        }
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <header className="h-[68px] bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                {breadcrumb && <span className="text-xs text-muted-foreground">{breadcrumb}</span>}
            </div>
            <div className="flex items-center gap-4">
                {/* Global search */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border transition-all focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/10 min-w-[240px]">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Глобальный поиск..."
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                        onKeyDown={handleSearchSubmit}
                        className="border-none bg-transparent text-[13px] text-foreground w-full outline-none placeholder:text-muted-foreground"
                    />
                </div>
                {/* Notifications */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="relative w-10 h-10 rounded-full flex items-center justify-center bg-background border border-border cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
                    >
                        <Bell className="w-[18px] h-[18px] text-foreground" />
                        {events.length > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                                {Math.min(events.length, 99)}
                            </span>
                        )}
                    </button>
                    {notificationsOpen && (
                        <div className="absolute right-0 top-full mt-2 w-[380px] bg-white border border-border rounded-2xl shadow-layered-lg overflow-hidden animate-fade-in-up z-50">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                                <h3 className="text-[14px] font-bold text-foreground">Уведомления</h3>
                                <button onClick={() => setNotificationsOpen(false)} className="p-1 rounded-lg hover:bg-background transition-colors">
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                                {events.length === 0 ? (
                                    <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                                        Нет новых уведомлений
                                    </div>
                                ) : events.map((ev, i) => (
                                    <div key={i} className="px-5 py-3 border-b border-border/50 hover:bg-primary/5 transition-colors flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <Zap className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold text-foreground">
                                                Тикет {ev.ticket_id.slice(0, 8)}...
                                            </p>
                                            <p className="text-[12px] text-muted-foreground">
                                                Статус: <span className="font-bold text-primary">{ev.status}</span>
                                                {ev.manager && <> &middot; {ev.manager}</>}
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">{ev.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
