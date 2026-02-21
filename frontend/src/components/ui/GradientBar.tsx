export default function GradientBar({ value, max = 100, size = 'md' }: { value: number; max?: number; size?: 'sm' | 'md' }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct > 80
    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
    : pct > 50
    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
    : 'linear-gradient(90deg, #00b323, #13db4b)'

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-1 rounded-full overflow-hidden bg-gray-100 ${size === 'sm' ? 'h-1.5' : 'h-2'}`}
        style={{ minWidth: 60 }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color, animation: 'fb-grow-width 0.8s ease-out' }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--fb-text-secondary)', minWidth: 32 }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}
