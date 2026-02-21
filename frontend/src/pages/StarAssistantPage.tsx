import { useState, useRef, useEffect } from 'react'
import { sendStarQuery } from '@/api/star'
import type { StarQueryResponse } from '@/types/common'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Sparkles, Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  data?: StarQueryResponse
}

const CHART_COLORS = ['#00b323', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const SUGGESTIONS = [
  'Show top managers by ticket count',
  'What is the sentiment distribution?',
  'Which office has highest load?',
  'List VIP tickets by priority',
]

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

export default function StarAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, loading])

  const send = async (question?: string) => {
    const q = question ?? input.trim()
    if (!q || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      const result = await sendStarQuery(q)
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: result.answer_text || 'Here are the results:',
        data: result,
      }])
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] fb-animate-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--fb-green), var(--fb-green-light))' }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fb-text)' }}>Star Assistant</h2>
          <p className="text-xs" style={{ color: 'var(--fb-text-secondary)' }}>
            Ask questions about your data in natural language
          </p>
        </div>
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="flex gap-2 mb-3 flex-wrap fb-animate-in fb-animate-delay-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="px-3 py-1.5 text-xs font-medium rounded-full transition-all hover:shadow-sm"
              style={{ background: 'var(--fb-green-50)', color: 'var(--fb-green)', border: '1px solid var(--fb-green-100)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div ref={chatRef} className="flex-1 overflow-auto fb-card p-4 mb-3 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--fb-green)' }} />
            <p className="text-sm" style={{ color: 'var(--fb-text-secondary)' }}>
              Ask a question like "Show top managers by ticket count"
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fb-animate-in`}>
            <div
              className="max-w-[80%] rounded-2xl p-3.5"
              style={msg.role === 'user'
                ? { background: 'linear-gradient(135deg, var(--fb-green), rgba(0,179,35,0.8))', color: '#fff' }
                : { background: 'var(--fb-bg-subtle)', color: 'var(--fb-text)', border: '1px solid var(--fb-border)' }
              }
            >
              <p className="text-sm">{msg.content}</p>
              {msg.data?.sql && (
                <pre
                  className="mt-2 p-2.5 text-xs rounded-lg overflow-x-auto font-mono"
                  style={{ background: '#0f172a', color: '#86efac' }}
                >
                  {msg.data.sql}
                </pre>
              )}
              {msg.data?.rows && msg.data.rows.length > 0 && (
                <div className="mt-3 bg-white rounded-lg p-2" style={{ border: msg.role === 'user' ? 'none' : undefined }}>
                  <RenderChart data={msg.data} />
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'var(--fb-bg-subtle)', color: 'var(--fb-green)', border: '1px solid var(--fb-border)' }}>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="flex-1 fb-input rounded-full px-5 py-2.5 text-sm"
          placeholder="Ask about your data..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          onClick={() => send()}
          disabled={loading}
          className="fb-green-btn w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function RenderChart({ data }: { data: StarQueryResponse }) {
  if (!data.columns || !data.rows || data.rows.length === 0) return null

  const chartData = data.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    data.columns.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })

  const labelKey = data.columns[0]
  const valueKey = data.columns.length > 1 ? data.columns[1] : data.columns[0]

  if (data.chart_suggestion === 'pie' && data.columns.length >= 2) {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={chartData} dataKey={valueKey} nameKey={labelKey} cx="50%" cy="50%" outerRadius={70} label={{ fill: '#64748b', fontSize: 11 }}>
            {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <XAxis dataKey={labelKey} tick={{ fill: '#64748b', fontSize: 11 }} stroke="#e2e8f0" />
        <YAxis tick={{ fill: '#64748b' }} stroke="#e2e8f0" />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey={valueKey} fill="url(#starGrad)" radius={[6, 6, 0, 0]} />
        <defs>
          <linearGradient id="starGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00b323" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  )
}
