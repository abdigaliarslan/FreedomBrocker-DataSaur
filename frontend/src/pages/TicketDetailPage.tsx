import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchTicket } from '@/api/tickets'
import type { TicketWithDetails } from '@/types/ticket'
import { ArrowLeft, Bot, MapPin, Route, User, Smile, Meh, Frown } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import GradientBar from '@/components/ui/GradientBar'

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [details, setDetails] = useState<TicketWithDetails | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    fetchTicket(id).then(setDetails).catch((e) => setError(e.message))
  }, [id])

  if (error) return <p className="text-red-500 p-6">{error}</p>
  if (!details) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full fb-shimmer" />
    </div>
  )

  const { ticket, ai, assignment, audit_trail } = details

  const SentimentIcon = ai?.sentiment === 'positive' ? Smile : ai?.sentiment === 'negative' ? Frown : Meh

  return (
    <div className="max-w-5xl fb-animate-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-1.5 font-medium transition-colors hover:text-green-600"
          style={{ color: 'var(--fb-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Tickets
        </button>
        <span style={{ color: 'var(--fb-border)' }}>/</span>
        <span className="font-mono text-xs" style={{ color: 'var(--fb-text-secondary)' }}>
          #{ticket.external_id ?? ticket.id.slice(0, 8)}
        </span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--fb-text)' }}>{ticket.subject}</h2>
        <div className="flex gap-2 items-center">
          {ticket.client_segment && <StatusBadge value={ticket.client_segment} />}
          <StatusBadge value={ticket.status} />
          <span className="text-xs ml-2" style={{ color: 'var(--fb-text-secondary)' }}>
            {new Date(ticket.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-5 gap-6 mb-6">
        {/* Left column (3/5) */}
        <div className="col-span-3 space-y-5">
          {/* Ticket Info */}
          <div className="fb-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fb-text)' }}>
              <User className="w-4 h-4" style={{ color: 'var(--fb-green)' }} /> Ticket Info
            </h3>
            <div className="space-y-2">
              <InfoRow label="Client" value={ticket.client_name ?? 'N/A'} />
              <InfoRow label="Address" value={ticket.raw_address ?? 'N/A'} />
              <InfoRow label="Channel" value={ticket.source_channel ?? 'N/A'} />
            </div>
            {ticket.body && (
              <div className="mt-4 p-3 rounded-lg text-sm italic" style={{ background: 'var(--fb-bg-subtle)', color: 'var(--fb-text-secondary)' }}>
                {ticket.body}
              </div>
            )}
          </div>
        </div>

        {/* Right column (2/5) */}
        <div className="col-span-2 space-y-5">
          {/* AI Enrichment */}
          {ai && (
            <div
              className="fb-card p-5 fb-animate-in fb-animate-delay-1"
              style={{ borderLeft: '3px solid var(--fb-green)' }}
            >
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--fb-text)' }}>
                <Bot className="w-4 h-4" style={{ color: 'var(--fb-green)' }} /> AI Enrichment
              </h3>
              <div className="space-y-4">
                {/* Type + Confidence */}
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--fb-text-secondary)' }}>Type</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fb-text)' }}>{ai.type ?? 'N/A'}</p>
                  {ai.confidence_type != null && <div className="mt-1"><GradientBar value={ai.confidence_type * 100} size="sm" /></div>}
                </div>

                {/* Sentiment */}
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--fb-text-secondary)' }}>Sentiment</p>
                  <div className="flex items-center gap-2">
                    <SentimentIcon
                      className="w-5 h-5"
                      style={{ color: ai.sentiment === 'positive' ? '#00b323' : ai.sentiment === 'negative' ? '#ef4444' : '#3b82f6' }}
                    />
                    <span className="text-sm font-semibold capitalize" style={{ color: 'var(--fb-text)' }}>
                      {ai.sentiment ?? 'N/A'}
                    </span>
                  </div>
                  {ai.confidence_sentiment != null && <div className="mt-1"><GradientBar value={ai.confidence_sentiment * 100} size="sm" /></div>}
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--fb-text-secondary)' }}>Priority</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold" style={{ color: 'var(--fb-text)' }}>{ai.priority_1_10 ?? '—'}</span>
                    <span className="text-xs" style={{ color: 'var(--fb-text-secondary)' }}>/ 10</span>
                  </div>
                  {ai.priority_1_10 != null && <div className="mt-1"><GradientBar value={ai.priority_1_10 * 10} size="sm" /></div>}
                </div>

                {/* Language */}
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--fb-text-secondary)' }}>Language</p>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {ai.lang}
                  </span>
                </div>

                {/* Summary */}
                {ai.summary && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--fb-text-secondary)' }}>Summary</p>
                    <p className="text-sm p-3 rounded-lg" style={{ background: 'var(--fb-bg-subtle)', color: 'var(--fb-text)' }}>{ai.summary}</p>
                  </div>
                )}

                {/* Actions */}
                {ai.recommended_actions && ai.recommended_actions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--fb-text-secondary)' }}>Recommended Actions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ai.recommended_actions.map((a, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geo */}
                <div className="flex items-center gap-2 pt-2 text-xs" style={{ color: 'var(--fb-text-secondary)', borderTop: '1px solid var(--fb-border)' }}>
                  <MapPin className="w-3 h-3" style={{ color: 'var(--fb-green)' }} />
                  Geo: {ai.geo_status} {ai.lat && ai.lon && `(${ai.lat.toFixed(4)}, ${ai.lon.toFixed(4)})`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assignment (full width) */}
      {assignment && (
        <div className="fb-card p-5 mb-5 fb-animate-in fb-animate-delay-2">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fb-text)' }}>
            <User className="w-4 h-4" style={{ color: 'var(--fb-green)' }} /> Assignment
          </h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #00b323, #059669)' }}
              >
                {(details.assigned_manager?.full_name ?? 'N').split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fb-text)' }}>
                  {details.assigned_manager?.full_name ?? assignment.manager_id}
                </p>
                <p className="text-xs" style={{ color: 'var(--fb-text-secondary)' }}>
                  Assigned {new Date(assignment.assigned_at).toLocaleString()}
                </p>
              </div>
            </div>
            {assignment.routing_reason && (
              <p className="text-xs italic" style={{ color: 'var(--fb-text-secondary)' }}>{assignment.routing_reason}</p>
            )}
          </div>
        </div>
      )}

      {/* Routing Trail */}
      {audit_trail && audit_trail.length > 0 && (
        <div className="fb-card p-5 fb-animate-in fb-animate-delay-3">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--fb-text)' }}>
            <Route className="w-4 h-4" style={{ color: 'var(--fb-green)' }} /> Routing Explanation
          </h3>
          <div className="space-y-0">
            {audit_trail.map((log, i) => (
              <div key={log.id} className={`flex gap-3 fb-animate-in fb-animate-delay-${Math.min(i + 1, 5)}`}>
                <div className="flex flex-col items-center">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--fb-green), var(--fb-green-light))' }}
                  >
                    {i + 1}
                  </div>
                  {i < audit_trail.length - 1 && (
                    <div className="w-0.5 flex-1 my-1" style={{ background: 'var(--fb-green-100)' }} />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--fb-green)' }}>
                    {log.step.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--fb-text)' }}>{log.decision}</p>
                  <p className="text-xs" style={{ color: 'var(--fb-text-secondary)' }}>
                    {new Date(log.created_at).toLocaleTimeString()}
                    {log.candidates && log.candidates.length > 0 && ` — ${log.candidates.length} candidates`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="font-medium" style={{ color: 'var(--fb-text-secondary)' }}>{label}: </span>
      <span className="font-semibold" style={{ color: 'var(--fb-text)' }}>{value}</span>
    </p>
  )
}
