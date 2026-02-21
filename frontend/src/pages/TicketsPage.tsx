import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTickets } from '@/api/tickets'
import type { Ticket } from '@/types/ticket'
import type { Pagination } from '@/types/common'
import { cn } from '@/lib/utils'
import { Search, ChevronRight } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import PageHeader from '@/components/ui/PageHeader'

const STATUSES = ['', 'new', 'enriching', 'enriched', 'routed', 'closed'] as const

export default function TicketsPage() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0 })
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const loadTickets = (page = 1) => {
    const params: Record<string, string | number> = { page, per_page: 20 }
    if (statusFilter) params.status = statusFilter
    if (search) params.search = search
    fetchTickets(params)
      .then((res) => {
        setTickets(res.data ?? [])
        setPagination(res.pagination)
      })
      .catch(console.error)
  }

  useEffect(() => { loadTickets() }, [statusFilter])

  return (
    <div className="fb-animate-in">
      <PageHeader title="Tickets" subtitle={`${pagination.total} total tickets`} />

      {/* Filters */}
      <div className="fb-card p-4 mb-5 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--fb-text-secondary)' }} />
          <input
            className="fb-input pl-9 pr-4 py-2 text-sm w-64"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
          />
        </div>
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                statusFilter === s
                  ? 'text-white border-transparent'
                  : 'border-transparent hover:bg-gray-50'
              )}
              style={statusFilter === s
                ? { background: 'linear-gradient(135deg, var(--fb-green), var(--fb-green-light))', boxShadow: '0 2px 8px rgba(0,179,35,0.25)' }
                : { color: 'var(--fb-text-secondary)' }
              }
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="fb-card overflow-hidden">
        <table className="w-full text-sm fb-table">
          <thead>
            <tr style={{ background: 'var(--fb-bg-subtle)' }}>
              <th className="text-left p-3 font-semibold">ID</th>
              <th className="text-left p-3 font-semibold">Subject</th>
              <th className="text-left p-3 font-semibold">Segment</th>
              <th className="text-left p-3 font-semibold">Status</th>
              <th className="text-left p-3 font-semibold">Created</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr
                key={t.id}
                className="cursor-pointer transition-colors group"
                onClick={() => navigate(`/tickets/${t.id}`)}
              >
                <td className="p-3 font-mono text-xs" style={{ color: 'var(--fb-text-secondary)' }}>
                  {t.external_id ?? t.id.slice(0, 8)}
                </td>
                <td className="p-3 max-w-xs truncate font-medium" style={{ color: 'var(--fb-text)' }}>
                  {t.subject}
                </td>
                <td className="p-3">
                  {t.client_segment && <StatusBadge value={t.client_segment} />}
                </td>
                <td className="p-3">
                  <StatusBadge value={t.status} />
                </td>
                <td className="p-3 text-xs" style={{ color: 'var(--fb-text-secondary)' }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--fb-green)' }} />
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center" style={{ color: 'var(--fb-text-secondary)' }}>
                  No tickets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-center gap-1.5 mt-5">
          {Array.from({ length: pagination.total_pages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => loadTickets(i + 1)}
              className={cn('w-9 h-9 rounded-lg text-sm font-semibold transition-all')}
              style={pagination.page === i + 1
                ? { background: 'linear-gradient(135deg, var(--fb-green), var(--fb-green-light))', color: '#fff', boxShadow: '0 2px 8px rgba(0,179,35,0.25)' }
                : { background: 'var(--fb-bg-subtle)', color: 'var(--fb-text-secondary)' }
              }
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
