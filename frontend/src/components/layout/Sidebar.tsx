import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Ticket,
    Users,
    Building2,
    Sparkles,
    Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tickets', icon: Ticket, label: 'Тикеты' },
    { to: '/managers', icon: Users, label: 'Менеджеры' },
    { to: '/offices', icon: Building2, label: 'Офисы' },
];

const toolItems = [
    { to: '/assistant', icon: Sparkles, label: 'Star Assistant' },
    { to: '/import', icon: Upload, label: 'Импорт' },
];

export default function Sidebar() {
    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[hsl(var(--sidebar-bg))] flex flex-col z-50 overflow-y-auto border-r border-white/5">
            <NavLink to="/" className="flex items-center gap-3 px-6 py-8 no-underline">
                <div className="w-10 h-10 min-w-[40px] rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-white font-extrabold text-base tracking-widest uppercase">FREEDOM</span>
                    <span className="text-white/40 font-medium text-[10px] tracking-[2px] uppercase">CRM Panel</span>
                </div>
            </NavLink>

            <nav className="flex-1 px-3 flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/20 px-4 py-2 mt-4">Основное</span>
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
                            isActive
                                ? "bg-primary/15 text-primary"
                                : "text-white/50 hover:bg-white/5 hover:text-white/80"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-inherit")} />
                                {label}
                                {isActive && <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" />}
                            </>
                        )}
                    </NavLink>
                ))}

                <div className="h-px bg-white/5 my-4 mx-4" />

                <span className="text-[10px] font-bold tracking-widest uppercase text-white/20 px-4 py-2">Инструменты</span>
                {toolItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
                            isActive
                                ? "bg-primary/15 text-primary"
                                : "text-white/50 hover:bg-white/5 hover:text-white/80"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-inherit")} />
                                {label}
                                {isActive && <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-[13px] font-bold text-white">РА</div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-white/90">Рауан Ахметов</span>
                        <span className="text-[11px] text-white/40">Администратор</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
