import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  enriching: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
  enriched: 'bg-purple-50 text-purple-700 border-purple-200',
  routed: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
  // Sentiments
  positive: 'bg-green-50 text-green-700 border-green-200',
  neutral: 'bg-blue-50 text-blue-700 border-blue-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
  // Segments
  VIP: 'bg-amber-50 text-amber-700 border-amber-300',
  Priority: 'bg-purple-50 text-purple-700 border-purple-200',
  Mass: 'bg-gray-50 text-gray-600 border-gray-200',
}

export default function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      STATUS_STYLES[value] ?? 'bg-gray-50 text-gray-600 border-gray-200',
      className
    )}>
      {value}
    </span>
  )
}
