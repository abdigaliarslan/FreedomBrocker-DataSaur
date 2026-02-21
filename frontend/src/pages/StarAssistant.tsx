import { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { queryStar } from '@/api/star';

interface Message {
    from: 'bot' | 'user';
    text: string;
    time: string;
}

export default function StarAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        { from: 'bot', text: 'Привет! Я Star Assistant — ваш AI-помощник. Я могу помочь с анализом тикетов, маршрутизацией, обогащением данных и ответами на вопросы. Чем могу помочь?', time: '16:00' },
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
            const botMsg: Message = {
                from: 'bot',
                text: response.answer || 'Извините, я не смог обработать ваш запрос.',
                time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            const botMsg: Message = {
                from: 'bot',
                text: 'Произошла ошибка при связи с AI-ядром. Попробуйте позже.',
                time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
            };
            setMessages(prev => [...prev, botMsg]);
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        'Покажи распределение VIP клиентов по офисам',
        'Средний приоритет обращений по городам',
        'Сколько тикетов типа Спам?',
        'Топ-5 менеджеров по нагрузке',
    ];

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header title="Star Assistant" />
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 scrollbar-thin">
                {messages.map((m, i) => (
                    <div key={i} className={cn(
                        "max-w-[80%] flex flex-col gap-1.5 animate-fade-in-up",
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
                            placeholder="Спросите что-нибудь у AI..."
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
