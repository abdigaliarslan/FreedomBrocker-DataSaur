import { useState, useEffect } from 'react';
import { X, Sparkles, User, MapPin, Clock, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchTicketDetail, enrichTicket, updateTicketStatus } from '@/api/tickets';
import type { TicketWithDetails } from '@/types/models';

interface Props {
    ticketId: string;
    onClose: () => void;
    onChanged?: () => void;
}

const STATUS_OPTIONS = [
    { value: 'new', label: 'Новый', color: 'bg-slate-100 text-slate-600' },
    { value: 'enriching', label: 'AI обработка', color: 'bg-blue-100 text-blue-700' },
    { value: 'enriched', label: 'Обогащён', color: 'bg-cyan-100 text-cyan-700' },
    { value: 'routed', label: 'Маршрутизирован', color: 'bg-purple-100 text-purple-700' },
    { value: 'open', label: 'Открыт', color: 'bg-amber-100 text-amber-700' },
    { value: 'progress', label: 'В работе', color: 'bg-blue-100 text-blue-700' },
    { value: 'resolved', label: 'Решён', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'closed', label: 'Закрыт', color: 'bg-gray-100 text-gray-500' },
];

const SENTIMENT_COLOR: Record<string, string> = {
    'Позитивный': 'text-emerald-600 bg-emerald-50',
    'Негативный': 'text-red-600 bg-red-50',
    'Нейтральный': 'text-blue-600 bg-blue-50',
};

export default function TicketDetail({ ticketId, onClose, onChanged }: Props) {
    const [detail, setDetail] = useState<TicketWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [enriching, setEnriching] = useState(false);

    const load = () => {
        setLoading(true);
        fetchTicketDetail(ticketId).then(setDetail).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(load, [ticketId]);

    const handleEnrich = async () => {
        setEnriching(true);
        try {
            await enrichTicket(ticketId);
            setTimeout(load, 1500);
            onChanged?.();
        } catch { /* ignore */ }
        finally { setEnriching(false); }
    };

    const handleStatus = async (status: string) => {
        try {
            await updateTicketStatus(ticketId, status);
            load();
            onChanged?.();
        } catch { /* ignore */ }
    };

    const t = detail?.ticket;
    const ai = detail?.ai;
    const assign = detail?.assignment;
    const mgr = detail?.assigned_manager;
    const trail = detail?.audit_trail ?? [];

    return (
        <>
            <div className="slideover-overlay" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-white z-50 shadow-layered-lg overflow-y-auto scrollbar-thin animate-slide-in-right flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-[15px] font-bold text-foreground">Детали тикета</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-background transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : !t ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
                        <AlertCircle className="w-5 h-5" /> Тикет не найден
                    </div>
                ) : (
                    <div className="flex-1 p-6 space-y-6">
                        {/* Subject + body */}
                        <div>
                            <h3 className="text-[16px] font-bold text-foreground leading-snug">{t.subject}</h3>
                            {t.client_name && <p className="text-[12px] text-muted-foreground mt-1">Клиент: {t.client_name}</p>}
                            <p className="text-[13px] text-foreground/80 mt-3 whitespace-pre-wrap leading-relaxed">{t.body}</p>
                            {t.raw_address && (
                                <div className="flex items-center gap-1.5 mt-2 text-[12px] text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5 text-primary" /> {t.raw_address}
                                </div>
                            )}
                        </div>

                        {/* Status pills */}
                        <div>
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Статус</label>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {STATUS_OPTIONS.map(s => (
                                    <button key={s.value} onClick={() => handleStatus(s.value)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-[11px] font-bold transition-all",
                                            t.status === s.value
                                                ? cn(s.color, "ring-2 ring-offset-1 ring-primary/30")
                                                : "bg-background text-muted-foreground hover:bg-muted"
                                        )}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Enrich button */}
                        {(t.status === 'new' || !ai) && (
                            <button onClick={handleEnrich} disabled={enriching}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-bold text-[13px] hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20">
                                {enriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {enriching ? 'AI обрабатывает...' : 'Запустить AI обогащение'}
                            </button>
                        )}

                        {/* AI section */}
                        {ai && (
                            <div className="rounded-xl border border-border p-4 space-y-3 bg-gradient-to-br from-primary/[0.03] to-transparent">
                                <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
                                    <Sparkles className="w-4 h-4 text-primary" /> AI-обогащение
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {ai.type && (
                                        <div className="bg-white rounded-lg border border-border/50 p-2.5">
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Тип</span>
                                            <p className="text-[12px] font-bold text-foreground mt-0.5">{ai.type}</p>
                                        </div>
                                    )}
                                    {ai.sentiment && (
                                        <div className="bg-white rounded-lg border border-border/50 p-2.5">
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Тональность</span>
                                            <p className={cn("text-[12px] font-bold mt-0.5 px-2 py-0.5 rounded-full inline-block", SENTIMENT_COLOR[ai.sentiment] || 'text-foreground')}>
                                                {ai.sentiment}
                                            </p>
                                        </div>
                                    )}
                                    {ai.priority_1_10 != null && (
                                        <div className="bg-white rounded-lg border border-border/50 p-2.5">
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Приоритет</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                                                    <div className={cn("h-full rounded-full", ai.priority_1_10 > 7 ? 'bg-red-500' : ai.priority_1_10 > 4 ? 'bg-amber-500' : 'bg-primary')}
                                                        style={{ width: `${ai.priority_1_10 * 10}%` }} />
                                                </div>
                                                <span className="text-[12px] font-bold">{ai.priority_1_10}/10</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {ai.summary && (
                                    <div className="bg-white rounded-lg border border-border/50 p-3">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Резюме</span>
                                        <p className="text-[12px] text-foreground mt-1 leading-relaxed">{ai.summary}</p>
                                    </div>
                                )}
                                {ai.recommended_actions && ai.recommended_actions.length > 0 && (
                                    <div className="bg-white rounded-lg border border-border/50 p-3">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Рекомендации</span>
                                        <ul className="mt-1 space-y-1">
                                            {ai.recommended_actions.map((a, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[12px] text-foreground">
                                                    <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" /> {a}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Assignment */}
                        {assign && mgr && (
                            <div className="rounded-xl border border-border p-4 space-y-2">
                                <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
                                    <User className="w-4 h-4 text-primary" /> Назначение
                                </div>
                                <p className="text-[13px] text-foreground">{mgr.full_name}</p>
                                <p className="text-[12px] text-muted-foreground">{mgr.office_name}, {mgr.office_city}</p>
                            </div>
                        )}

                        {/* Audit trail */}
                        {trail.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-[13px] font-bold text-foreground mb-3">
                                    <Clock className="w-4 h-4 text-primary" /> Аудит
                                </div>
                                <div className="space-y-0 border-l-2 border-border ml-2 pl-4">
                                    {trail.map((log, i) => (
                                        <div key={i} className="relative pb-4">
                                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white" />
                                            <p className="text-[12px] font-bold text-foreground">{log.step}</p>
                                            {log.decision && <p className="text-[11px] text-muted-foreground">{log.decision}</p>}
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {new Date(log.created_at).toLocaleString('ru-RU')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Meta */}
                        <div className="text-[11px] text-muted-foreground space-y-1 pt-4 border-t border-border">
                            <p>ID: <span className="font-mono">{t.id}</span></p>
                            <p>Создан: {new Date(t.created_at).toLocaleString('ru-RU')}</p>
                            {t.client_segment && <p>Сегмент: {t.client_segment}</p>}
                            {t.source_channel && <p>Канал: {t.source_channel}</p>}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
