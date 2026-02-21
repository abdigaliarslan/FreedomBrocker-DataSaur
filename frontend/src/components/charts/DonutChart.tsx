interface Segment {
    label: string;
    value: number;
    color: string;
}

interface DonutChartProps {
    data: Segment[];
    size?: number;
    strokeWidth?: number;
}

export default function DonutChart({ data, size = 160, strokeWidth = 24 }: DonutChartProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = data.reduce((s, d) => s + d.value, 0);
    const center = size / 2;

    const offsets = data.reduce<number[]>((acc, _seg, i) => {
        const prev = i === 0 ? 0 : acc[i - 1] + (total > 0 ? data[i - 1].value / total : 0);
        acc.push(prev);
        return acc;
    }, []);

    return (
        <div className="flex items-center gap-6">
            <svg width={size} height={size} className="transform -rotate-90 shrink-0">
                {/* Background ring */}
                <circle cx={center} cy={center} r={radius} fill="none"
                    stroke="hsl(var(--border))" strokeWidth={strokeWidth} opacity={0.5} />
                {data.map((seg, i) => {
                    const pct = total > 0 ? seg.value / total : 0;
                    const dash = circumference * pct;
                    const offset = -circumference * offsets[i];
                    return (
                        <circle
                            key={i} cx={center} cy={center} r={radius}
                            fill="none" stroke={seg.color} strokeWidth={strokeWidth}
                            strokeDasharray={`${dash} ${circumference - dash}`}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                        />
                    );
                })}
                <text x={center} y={center} textAnchor="middle" dominantBaseline="central"
                    className="fill-foreground text-[24px] font-extrabold"
                    transform={`rotate(90 ${center} ${center})`}>
                    {total}
                </text>
            </svg>
            <div className="flex flex-col gap-2.5">
                {data.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-[12px] text-muted-foreground font-medium">{seg.label}</span>
                        <span className="text-[12px] font-bold text-foreground ml-auto pl-3">{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
