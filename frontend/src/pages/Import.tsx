import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Bot, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { importData } from '@/api/import';

interface ImportResult {
    name: string;
    rows: number;
    total: number;
    type: string;
    status: 'success' | 'error' | 'processing';
    time: string;
    error?: string;
}

export default function ImportPage() {
    const [dragover, setDragover] = useState(false);
    const [results, setResults] = useState<ImportResult[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        const start = Date.now();
        const newResult: ImportResult = {
            name: file.name,
            rows: 0,
            total: 0,
            type: '',
            status: 'processing',
            time: '...'
        };
        setResults(prev => [newResult, ...prev]);

        try {
            const res = await importData(file);
            const d = res.data || res;
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            const typeLabels: Record<string, string> = {
                tickets: 'Тикеты',
                managers: 'Менеджеры',
                business_units: 'Офисы',
            };
            setResults(prev => prev.map(r => r.name === file.name ? {
                ...r,
                status: 'success',
                rows: d.imported || 0,
                total: d.total || 0,
                type: typeLabels[d.type] || d.type || '',
                time: `${elapsed} сек`
            } : r));
        } catch (error: unknown) {
            console.error(error);
            const msg = error instanceof Error ? error.message : 'Сбой загрузки';
            setResults(prev => prev.map(r => r.name === file.name ? {
                ...r,
                status: 'error',
                error: msg
            } : r));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragover(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div className="flex flex-col min-h-full">
            <Header title="Импорт данных" />
            <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
                <div
                    onDragOver={e => { e.preventDefault(); setDragover(true); }}
                    onDragLeave={() => setDragover(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                        "group bg-white border-2 border-dashed rounded-[2rem] p-16 text-center transition-all cursor-pointer shadow-sm hover:shadow-xl",
                        dragover
                            ? "border-primary bg-primary/5 scale-[1.02]"
                            : "border-border hover:border-primary/50"
                    )}
                >
                    <input
                        type="file"
                        ref={fileRef}
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary mx-auto mb-8 transition-transform group-hover:-translate-y-2 group-hover:bg-primary group-hover:text-white duration-500">
                        <Upload className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-foreground mb-3">Перетащите файлы сюда</h2>
                    <p className="text-muted-foreground font-medium mb-8">или <span className="text-primary hover:underline">выберите на компьютере</span></p>
                    <div className="flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            CSV
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            Excel (XLSX, XLS)
                        </div>
                    </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex gap-5 items-start">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
                        <Bot className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h4 className="text-[15px] font-bold text-foreground">AI-Обогащение данных</h4>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                            Все импортированные данные автоматически обрабатываются нашими AI-алгоритмами:
                            нормализация адресов, проверка контактов и интеллектуальное распределение по сегментам.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-3">
                        История импорта
                        {results.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-background border border-border text-[10px] text-muted-foreground">{results.length}</span>
                        )}
                    </h3>
                    <div className="grid gap-3">
                        {results.map((r, i) => (
                            <div key={i} className="bg-white border border-border rounded-2xl p-5 flex items-center gap-5 transition-all hover:border-primary/30 group">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                    r.status === 'success' ? "bg-success/10 text-success" :
                                        r.status === 'error' ? "bg-destructive/10 text-destructive" : "bg-blue-100 text-blue-600"
                                )}>
                                    {r.status === 'success' ? <CheckCircle className="w-6 h-6" /> :
                                        r.status === 'error' ? <AlertCircle className="w-6 h-6" /> :
                                            <Loader2 className="w-6 h-6 animate-spin" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">
                                        {r.name}
                                        {r.type && <span className="ml-2 text-[11px] text-muted-foreground font-medium">({r.type})</span>}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-tighter">
                                        {r.status === 'success' ? (
                                            <>
                                                <span className="text-success">{r.total} записей обработано</span>
                                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                <span>{r.time}</span>
                                            </>
                                        ) : r.error ? (
                                            <span className="text-destructive">{r.error}</span>
                                        ) : (
                                            <span>Загрузка...</span>
                                        )}
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest",
                                    r.status === 'success' ? "bg-success/15 text-success" :
                                        r.status === 'error' ? "bg-destructive/15 text-destructive" : "bg-blue-100 text-blue-600"
                                )}>
                                    {r.status === 'success' ? 'Готово' : r.status === 'error' ? 'Ошибка' : 'В процессе'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
