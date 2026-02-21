import { useEffect, useState } from 'react'
import { fetchManagers } from '@/api/managers'
import type { ManagerWithOffice } from '@/types/ticket'
import PageHeader from '@/components/ui/PageHeader'
import GradientBar from '@/components/ui/GradientBar'
import { Mail, Globe, Building2 } from 'lucide-react'

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #00b323, #059669)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ef4444, #dc2626)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
]

export default function ManagersPage() {
  const [managers, setManagers] = useState<ManagerWithOffice[]>([])

  useEffect(() => {
    fetchManagers().then(setManagers).catch(console.error)
  }, [])

  return (
    <div className="fb-animate-in">
      <PageHeader title="Managers" subtitle={`${managers.length} team members`} />

      <div className="grid grid-cols-3 gap-4">
        {managers.map((m, i) => {
          const initials = m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          return (
            <div key={m.id} className={`fb-card fb-card-glow p-5 fb-animate-in fb-animate-delay-${Math.min(i + 1, 5)}`}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--fb-text)' }}>{m.full_name}</p>
                  {m.email && (
                    <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--fb-text-secondary)' }}>
                      <Mail className="w-3 h-3 shrink-0" /> {m.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Office */}
              <div className="mb-3">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-50 border"
                  style={{ borderColor: 'var(--fb-border)', color: 'var(--fb-text-secondary)' }}
                >
                  <Building2 className="w-3 h-3" /> {m.office_city}
                </span>
              </div>

              {/* Skills */}
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {m.is_vip_skill && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    VIP
                  </span>
                )}
                {m.is_chief_spec && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Chief
                  </span>
                )}
                {!m.is_vip_skill && !m.is_chief_spec && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                    Standard
                  </span>
                )}
              </div>

              {/* Languages */}
              {m.languages && m.languages.length > 0 && (
                <div className="flex items-center gap-1.5 mb-4">
                  <Globe className="w-3 h-3 shrink-0" style={{ color: 'var(--fb-text-secondary)' }} />
                  <div className="flex gap-1 flex-wrap">
                    {m.languages.map((lang) => (
                      <span key={lang} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Load */}
              <div className="pt-3" style={{ borderTop: '1px solid var(--fb-border)' }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--fb-text-secondary)' }}>
                    Load: {m.current_load} / {m.max_load}
                  </span>
                </div>
                <GradientBar value={m.utilization_pct} />
              </div>
            </div>
          )
        })}
        {managers.length === 0 && (
          <div className="col-span-3 fb-card p-12 text-center">
            <p style={{ color: 'var(--fb-text-secondary)' }}>No managers found</p>
          </div>
        )}
      </div>
    </div>
  )
}
