import { useEffect, useState } from 'react'
import { fetchOffices, fetchManagers } from '@/api/managers'
import type { BusinessUnit } from '@/types/common'
import type { ManagerWithOffice } from '@/types/ticket'
import { Building2, MapPin, Users, BarChart3 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import GradientBar from '@/components/ui/GradientBar'

export default function OfficesPage() {
  const [offices, setOffices] = useState<BusinessUnit[]>([])
  const [managers, setManagers] = useState<ManagerWithOffice[]>([])

  useEffect(() => {
    fetchOffices().then(setOffices).catch(console.error)
    fetchManagers().then(setManagers).catch(console.error)
  }, [])

  const managersByOffice = (officeId: string) => managers.filter((m) => m.business_unit_id === officeId)

  return (
    <div className="fb-animate-in">
      <PageHeader title="Offices" subtitle={`${offices.length} business units`} />

      <div className="grid grid-cols-2 gap-6">
        {offices.map((o, i) => {
          const officeManagers = managersByOffice(o.id)
          const avgUtil = officeManagers.length > 0
            ? officeManagers.reduce((s, m) => s + m.utilization_pct, 0) / officeManagers.length
            : 0

          return (
            <div key={o.id} className={`fb-card fb-card-glow p-6 fb-animate-in fb-animate-delay-${i + 1}`}>
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--fb-green), var(--fb-green-light))' }}
                >
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--fb-text)' }}>{o.name}</h3>
                  <p className="text-sm flex items-center gap-1" style={{ color: 'var(--fb-text-secondary)' }}>
                    <MapPin className="w-3 h-3" /> {o.city}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-lg" style={{ background: 'var(--fb-bg-subtle)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-3.5 h-3.5" style={{ color: 'var(--fb-green)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--fb-text-secondary)' }}>Managers</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: 'var(--fb-text)' }}>{officeManagers.length}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--fb-bg-subtle)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--fb-green)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--fb-text-secondary)' }}>Avg Load</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: 'var(--fb-text)' }}>{avgUtil.toFixed(0)}%</p>
                </div>
              </div>

              {/* Address */}
              {o.address && (
                <p className="text-xs mb-4 flex items-center gap-1.5" style={{ color: 'var(--fb-text-secondary)' }}>
                  <MapPin className="w-3 h-3 shrink-0" style={{ color: 'var(--fb-green)' }} />
                  {o.address}
                </p>
              )}

              {/* Manager list */}
              {officeManagers.length > 0 && (
                <div style={{ borderTop: '1px solid var(--fb-border)' }} className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--fb-text-secondary)' }}>
                    Team Members
                  </p>
                  <div className="space-y-2.5">
                    {officeManagers.map((m) => {
                      const initials = m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
                      return (
                        <div key={m.id} className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #00b323, #059669)' }}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--fb-text)' }}>{m.full_name}</p>
                          </div>
                          <div className="w-24">
                            <GradientBar value={m.utilization_pct} size="sm" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {offices.length === 0 && (
          <div className="col-span-2 fb-card p-12 text-center">
            <p style={{ color: 'var(--fb-text-secondary)' }}>No offices found</p>
          </div>
        )}
      </div>
    </div>
  )
}
