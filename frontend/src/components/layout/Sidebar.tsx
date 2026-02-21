import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Ticket,
    Users,
    Building2,
    Sparkles,
    Upload,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

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

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    return (
        <aside className={cn(
            "fixed left-0 top-0 bottom-0 flex flex-col z-50 overflow-y-auto overflow-x-hidden transition-all duration-300",
            "bg-[hsl(var(--sidebar-bg))] border-r border-white/5",
            collapsed ? "w-20" : "w-64"
        )}>
            {/* Collapse toggle */}
            <button
                onClick={onToggle}
                className="absolute top-7 -right-0 w-6 h-6 rounded-l-md bg-[hsl(var(--sidebar-bg))] border border-white/10 border-r-0 flex items-center justify-center text-white/40 hover:text-white hover:bg-primary transition-all z-50"
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>

            {/* Logo */}
            <NavLink to="/" className={cn("flex items-center gap-3 py-8 no-underline", collapsed ? "px-5 justify-center" : "px-6")}>
                <div className="w-10 h-10 min-w-[40px] rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>
                {!collapsed && (
                    <div className="flex flex-col leading-tight">
                        <span className="text-white font-extrabold text-base tracking-widest uppercase">FREEDOM</span>
                        <span className="text-white/40 font-medium text-[10px] tracking-[2px] uppercase">CRM Panel</span>
                    </div>
                )}
            </NavLink>

            {/* Nav */}
            <nav className="flex-1 px-3 flex flex-col gap-1">
                {!collapsed && <span className="text-[10px] font-bold tracking-widest uppercase text-white/20 px-4 py-2 mt-4">Основное</span>}
                {collapsed && <div className="mt-4" />}
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        title={collapsed ? label : undefined}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 rounded-lg text-sm font-medium transition-all group relative",
                            collapsed ? "px-0 py-2.5 justify-center" : "px-4 py-2.5",
                            isActive
                                ? "bg-primary/15 text-primary shadow-md shadow-primary/10"
                                : "text-white/50 hover:bg-white/5 hover:text-white/80"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-inherit")} />
                                {!collapsed && label}
                                {isActive && <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" />}
                            </>
                        )}
                    </NavLink>
                ))}

                <div className={cn("h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent my-4", collapsed ? "mx-2" : "mx-4")} />

                {!collapsed && <span className="text-[10px] font-bold tracking-widest uppercase text-white/20 px-4 py-2">Инструменты</span>}
                {toolItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        title={collapsed ? label : undefined}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 rounded-lg text-sm font-medium transition-all group relative",
                            collapsed ? "px-0 py-2.5 justify-center" : "px-4 py-2.5",
                            isActive
                                ? "bg-primary/15 text-primary shadow-md shadow-primary/10"
                                : "text-white/50 hover:bg-white/5 hover:text-white/80"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-inherit")} />
                                {!collapsed && label}
                                {isActive && <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User */}
            <div className="p-4 border-t border-white/5">
                <div className={cn("flex items-center gap-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group", collapsed ? "p-2 justify-center" : "p-2.5")}>
                    <div className="w-9 h-9 min-w-[36px] rounded-full bg-primary flex items-center justify-center text-[13px] font-bold text-white">РА</div>
                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-white/90">Рауан Ахметов</span>
                            <span className="text-[11px] text-white/40">Администратор</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
