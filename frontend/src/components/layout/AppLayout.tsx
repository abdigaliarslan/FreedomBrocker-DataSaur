import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-background bg-grid-pattern">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
            <main className={cn(
                "flex-1 min-h-screen transition-all duration-300",
                collapsed ? "ml-20" : "ml-64"
            )}>
                <Outlet />
            </main>
        </div>
    );
}
