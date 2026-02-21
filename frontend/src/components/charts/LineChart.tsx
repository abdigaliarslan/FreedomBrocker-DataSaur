interface LineChartProps {
    data: { label: string; value: number }[];
    height?: number;
    color?: string;
}

export default function LineChart({ data, height = 180, color = '#00C853' }: LineChartProps) {
    if (data.length === 0) return <div className="text-center text-muted-foreground py-8 text-[13px]">Нет данных</div>;

    const width = 560;
    const pad = { top: 16, right: 16, bottom: 36, left: 8 };
    const cw = width - pad.left - pad.right;
    const ch = height - pad.top - pad.bottom;
    const maxVal = Math.max(...data.map(d => d.value), 1);

    const points = data.map((d, i) => ({
        x: pad.left + (i / Math.max(data.length - 1, 1)) * cw,
        y: pad.top + ch - (d.value / maxVal) * ch,
    }));

    const lineStr = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaStr = `${pad.left},${pad.top + ch} ${lineStr} ${pad.left + cw},${pad.top + ch}`;

    const step = Math.max(1, Math.ceil(data.length / 7));

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                <line key={i}
                    x1={pad.left} y1={pad.top + ch * (1 - pct)}
                    x2={pad.left + cw} y2={pad.top + ch * (1 - pct)}
                    stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" />
            ))}
            {/* Area */}
            <polygon points={areaStr} fill={color} opacity="0.08" />
            {/* Line */}
            <polyline points={lineStr} fill="none" stroke={color} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots */}
            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2" />
            ))}
            {/* X labels */}
            {data.map((d, i) => {
                if (i % step !== 0 && i !== data.length - 1) return null;
                return (
                    <text key={i} x={points[i].x} y={pad.top + ch + 20}
                        textAnchor="middle" className="fill-[hsl(var(--muted-foreground))]" fontSize="9" fontWeight="500">
                        {d.label}
                    </text>
                );
            })}
        </svg>
    );
}
