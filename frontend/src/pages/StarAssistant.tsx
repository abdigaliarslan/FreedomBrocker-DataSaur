import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { queryStar } from '@/api/star';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import LineChart from '@/components/charts/LineChart';

const CHART_COLORS = ['#00C853', '#00BFA5', '#2979FF', '#FF6D00', '#AA00FF', '#F50057', '#FFD600', '#00B8D4'];

interface ChartData {
    type: string;
    columns: string[];
    rows: (string | number)[][];
    xLabel?: string;
    yLabel?: string;
}

interface Message {
    from: 'bot' | 'user';
    text: string;
    time: string;
    chartData?: ChartData;
    sql?: string;
}

function renderChart(data: ChartData) {
    if (data.type === 'number' && data.rows.length > 0) {
        const value = data.rows[0][data.rows[0].length - 1];
        return (
            <div className="flex flex-col items-center py-6">
                <span className="text-5xl font-black text-primary">{typeof value === 'number' ? Math.round(value * 100) / 100 : value}</span>
                {data.columns.length > 0 && <span className="text-[12px] text-muted-foreground mt-2 font-bold uppercase">{data.columns[data.columns.length - 1]}</span>}
            </div>
        );
    }

    if (data.type === 'bar') {
        const items = data.rows.map((r, i) => ({
            label: String(r[0]),
            value: Number(r[1]) || 0,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }));
        return <BarChart data={items} />;
    }

    if (data.type === 'pie') {
        const segments = data.rows.map((r, i) => ({
            label: String(r[0]),
            value: Number(r[1]) || 0,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }));
        return <DonutChart data={segments} />;
    }

    if (data.type === 'line') {
        const items = data.rows.map(r => ({
            label: String(r[0]),
            value: Number(r[1]) || 0,
        }));
        return <LineChart data={items} color={CHART_COLORS[0]} />;
    }

    // Default: table
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
                <thead>
                    <tr className="border-b border-border">
                        {data.columns.map((col, i) => (
                            <th key={i} className="py-2 px-3 text-left font-bold text-muted-foreground uppercase tracking-wider">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, i) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-background/50">
                            {row.map((cell, j) => (
                                <td key={j} className="py-2 px-3 font-medium">{cell != null ? String(cell) : '—'}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function StarAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        { from: 'bot', text: 'Привет! Я Star Assistant — AI-аналитик Freedom Broker. Задайте вопрос о тикетах, менеджерах или офисах — я сгенерирую SQL-запрос и покажу результат с графиком.', time: '—' },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const now = new Date();
        const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        const userMsg: Message = { from: 'user', text: input, time };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await queryStar(input);
            const botTime = `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`;
            const botMsg: Message = {
                from: 'bot',
                text: response.answer_text || 'Готово!',
                time: botTime,
                sql: response.sql,
                chartData: response.rows && response.rows.length > 0 ? {
                    type: response.chart_type || 'table',
                    columns: response.columns || [],
                    rows: response.rows,
                    xLabel: response.x_label,
                    yLabel: response.y_label,
                } : undefined,
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error: any) {
            console.error(error);
            const botMsg: Message = {
                from: 'bot',
                text: 'Произошла ошибка при связи с AI-ядром. Попробуйте позже.',
                time: `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`
            };
            setMessages(prev => [...prev, botMsg]);
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        'Распределение тикетов по типам',
        'Средний приоритет обращений по офисам',
        'Сколько тикетов типа Спам?',
        'Топ-5 менеджеров по нагрузке',
        'Распределение VIP клиентов по городам',
        'Среднее время обработки AI',
    ];

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header title="Star Assistant" />
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 scrollbar-thin">
                {messages.map((m, i) => (
                    <div key={i} className={cn(
                        "max-w-[85%] flex flex-col gap-1.5 animate-fade-in-up",
                        m.from === 'user' ? "self-end items-end" : "self-start items-start"
                    )}>
                        <div className={cn(
                            "px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed",
                            m.from === 'user'
                                ? "bg-primary text-white font-medium rounded-br-none shadow-md shadow-primary/20"
                                : "glass-card text-foreground font-medium rounded-bl-none shadow-card"
                        )}>
                            {m.text.split('\n').map((line, j) => (
                                <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>
                            ))}
                            {m.chartData && (
                                <div className="mt-4 bg-white rounded-lg border border-border/50 p-4">
                                    {renderChart(m.chartData)}
                                </div>
                            )}
                            {m.sql && (
                                <details className="mt-3">
                                    <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> SQL запрос
                                    </summary>
                                    <pre className="mt-2 text-[11px] bg-sidebar text-white rounded-lg p-3 overflow-x-auto font-mono">{m.sql}</pre>
                                </details>
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{m.time}</span>
                    </div>
                ))}
                {loading && (
                    <div className="self-start flex items-center gap-3 glass-card px-5 py-3.5 rounded-2xl rounded-bl-none shadow-card text-muted-foreground animate-fade-in">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-8 bg-white border-t border-border space-y-4">
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => setInput(s)}
                            className="px-4 py-1.5 rounded-full border border-border text-[12px] font-bold text-muted-foreground hover:border-primary hover:text-primary hover:scale-105 transition-all bg-background"
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-3 px-5 py-3 rounded-xl bg-background border border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                        <Bot className="w-5 h-5 text-primary" />
                        <input
                            type="text"
                            placeholder="Задайте вопрос об аналитике..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium"
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
