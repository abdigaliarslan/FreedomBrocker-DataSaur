import { cn } from '@/lib/utils';

interface BarItem {
    label: string;
    value: number;
    color?: string;
}

interface BarChartProps {
    data: BarItem[];
    maxValue?: number;
}

export default function BarChart({ data, maxValue }: BarChartProps) {
    const max = maxValue ?? Math.max(...data.map(d => d.value), 1);

    return (
        <div className="flex flex-col gap-3">
            {data.map((item, i) => (
                <div key={i} className={cn("flex items-center gap-3 animate-fade-in-up")} style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="text-[11px] font-medium text-muted-foreground w-24 truncate shrink-0" title={item.label}>
                        {item.label}
                    </span>
                    <div className="flex-1 h-5 bg-background rounded-full overflow-hidden border border-border/50">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${Math.max((item.value / max) * 100, 2)}%`,
                                backgroundColor: item.color || 'hsl(var(--primary))',
                            }}
                        />
                    </div>
                    <span className="text-[11px] font-bold text-foreground w-8 text-right shrink-0">
                        {item.value}
                    </span>
                </div>
            ))}
        </div>
    );
}
