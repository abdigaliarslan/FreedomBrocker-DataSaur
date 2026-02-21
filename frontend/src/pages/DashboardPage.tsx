import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStats, fetchSentiment, fetchCategories, fetchManagerLoad, fetchTimeline } from '@/api/dashboard'
import type { DashboardStats, SentimentData, CategoryData, ManagerLoadData, TimelineData } from '@/types/dashboard'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, Legend,
} from 'recharts'
import { BarChart3, CheckCircle, Clock, TrendingUp, Star, MapPinOff, Upload, Ticket } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#00b323',
  neutral: '#3b82f6',
  negative: '#ef4444',
  unknown: '#94a3b8',
}

const tooltipStyle = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    color: '#0f172a',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: '13px',
  },
  itemStyle: { color: '#0f172a' },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [sentiment, setSentiment] = useState<SentimentData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [managerLoad, setManagerLoad] = useState<ManagerLoadData[]>([])
  const [timeline, setTimeline] = useState<TimelineData[]>([])

  useEffect(() => {
    fetchStats().then(setStats).catch(console.error)
    fetchSentiment().then(setSentiment).catch(console.error)
    fetchCategories().then(setCategories).catch(console.error)
    fetchManagerLoad().then(setManagerLoad).catch(console.error)
    fetchTimeline().then(setTimeline).catch(console.error)
  }, [])

  const totalSentiment = sentiment.reduce((s, d) => s + d.count, 0)

  const kpis = [
    { title: 'Total Tickets', value: stats?.total_tickets ?? 0, icon: BarChart3, gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', bg: '#eff6ff' },
    { title: 'Routed', value: stats?.routed_tickets ?? 0, icon: CheckCircle, gradient: 'linear-gradient(135deg, #00b323, #059669)', bg: '#f0fdf4' },
    { title: 'Pending', value: stats?.pending_tickets ?? 0, icon: Clock, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', bg: '#fffbeb' },
    { title: 'Avg Priority', value: stats?.avg_priority?.toFixed(1) ?? '0', icon: TrendingUp, gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', bg: '#f5f3ff' },
  ]

  return (
    <div>
      {/* Welcome */}
      <div className="fb-animate-in mb-6">
        <PageHeader
          title="Welcome back"
          subtitle={`Here's what's happening with your tickets today — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
          actions={
            <div className="flex gap-2">
              <button onClick={() => navigate('/import')} className="fb-green-btn px-4 py-2 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" /> Import Data
              </button>
              <button
                onClick={() => navigate('/tickets')}
                className="px-4 py-2 text-sm font-semibold rounded-[10px] flex items-center gap-2 transition-all"
                style={{ border: '1px solid var(--fb-border)', color: 'var(--fb-text)' }}
              >
                <Ticket className="w-4 h-4" /> View All Tickets
              </button>
            </div>
          }
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <div key={kpi.title} className={`fb-card fb-card-glow p-5 fb-animate-in fb-animate-delay-${i + 1}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'var(--fb-text-secondary)' }}>{kpi.title}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: kpi.gradient }}>
                <kpi.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--fb-text)' }}>{kpi.value}</p>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: kpi.bg }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${stats ? Math.min(((typeof kpi.value === 'number' ? kpi.value : 0) / Math.max(stats.total_tickets, 1)) * 100, 100) : 0}%`,
                  background: kpi.gradient,
                  animation: 'fb-grow-width 1s ease-out',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* VIP + Geo counters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="fb-card p-4 flex items-center gap-4 fb-animate-in fb-animate-delay-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Star className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fb-text-secondary)' }}>VIP Tickets</p>
            <p className="text-xl font-bold" style={{ color: 'var(--fb-text)' }}>{stats?.vip_count ?? 0}</p>
          </div>
        </div>
        <div className="fb-card p-4 flex items-center gap-4 fb-animate-in fb-animate-delay-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <MapPinOff className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fb-text-secondary)' }}>Unknown Geo</p>
            <p className="text-xl font-bold" style={{ color: 'var(--fb-text)' }}>{stats?.unknown_geo_count ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Charts 2x2 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Sentiment Donut */}
        <div className="fb-card p-5 fb-animate-in fb-animate-delay-2">
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--fb-text)' }}>Sentiment Distribution</h3>
          {sentiment.length > 0 ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sentiment}
                    dataKey="count"
                    nameKey="sentiment"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {sentiment.map((entry) => (
                      <Cell key={entry.sentiment} fill={SENTIMENT_COLORS[entry.sentiment] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) => <span style={{ color: 'var(--fb-text)', fontSize: '12px', fontWeight: 500 }}>{value}</span>}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 30 }}>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: 'var(--fb-text)' }}>{totalSentiment}</p>
                  <p className="text-xs" style={{ color: 'var(--fb-text-secondary)' }}>tickets</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState text="No sentiment data yet" />
          )}
        </div>

        {/* Categories Horizontal Bar */}
        <div className="fb-card p-5 fb-animate-in fb-animate-delay-3">
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--fb-text)' }}>Ticket Categories</h3>
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[...categories].sort((a, b) => b.count - a.count)} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis type="category" dataKey="type" width={120} tick={{ fill: '#0f172a', fontSize: 12, fontWeight: 500 }} stroke="none" />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill="url(#catGrad)" radius={[0, 6, 6, 0]} barSize={20} />
                <defs>
                  <linearGradient id="catGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00b323" />
                    <stop offset="100%" stopColor="#86efac" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="No category data yet" />
          )}
        </div>

        {/* Manager Load */}
        <div className="fb-card p-5 fb-animate-in fb-animate-delay-4">
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--fb-text)' }}>Manager Workload</h3>
          {managerLoad.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={managerLoad}>
                <XAxis dataKey="manager_name" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#e2e8f0" />
                <YAxis tick={{ fill: '#64748b' }} stroke="#e2e8f0" domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80%', fill: '#ef4444', fontSize: 11 }} />
                <Bar dataKey="utilization_pct" radius={[6, 6, 0, 0]} barSize={28} name="Utilization %">
                  {managerLoad.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.utilization_pct > 80 ? '#ef4444' : entry.utilization_pct > 50 ? '#f59e0b' : '#00b323'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="No workload data yet" />
          )}
        </div>

        {/* Timeline Area Chart */}
        <div className="fb-card p-5 fb-animate-in fb-animate-delay-5">
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--fb-text)' }}>Tickets Over Time</h3>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={timeline}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#e2e8f0" />
                <YAxis tick={{ fill: '#64748b' }} stroke="#e2e8f0" />
                <Tooltip {...tooltipStyle} />
                <defs>
                  <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00b323" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00b323" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#00b323"
                  strokeWidth={2}
                  fill="url(#timelineGrad)"
                  name="Tickets"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="No timeline data yet" />
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-[250px]">
      <p className="text-sm" style={{ color: 'var(--fb-text-secondary)' }}>{text}</p>
    </div>
  )
}
