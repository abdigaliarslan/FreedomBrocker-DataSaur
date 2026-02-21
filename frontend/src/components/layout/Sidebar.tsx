import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Ticket, Users, Building2, Sparkles, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/managers', label: 'Managers', icon: Users },
  { to: '/offices', label: 'Offices', icon: Building2 },
  { to: '/star', label: 'Star Assistant', icon: Sparkles },
  { to: '/import', label: 'Import', icon: Upload },
]

export default function Sidebar() {
  return (
    <aside
      className="w-64 min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0a0e27 0%, #0d1f17 100%)' }}
    >
      {/* Logo */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm"
            style={{ background: 'linear-gradient(135deg, #00b323, #13db4b)', boxShadow: '0 4px 12px rgba(0,179,35,0.3)' }}
          >
            F
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">F.I.R.E.</h1>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#5a6a80' }}>Challenge</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-2 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />

      {/* Avatar placeholder */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d5a3f)' }}>
          FB
        </div>
        <div>
          <p className="text-xs font-medium text-white/80">Operator</p>
          <p className="text-[10px]" style={{ color: '#5a6a80' }}>Freedom Broker</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              )
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'linear-gradient(135deg, #00b323, rgba(19,219,75,0.7))', boxShadow: '0 4px 15px rgba(0,179,35,0.3)' }
                : {}
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4">
        <div className="fb-sidebar-glass rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-white/40">Freedom Broker</p>
          <p className="text-[10px] font-bold" style={{ color: '#00b323' }}>DataSaur Team</p>
        </div>
      </div>
    </aside>
  )
}
