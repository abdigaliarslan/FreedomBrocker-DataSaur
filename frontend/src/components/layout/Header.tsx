import { Search, Bell } from 'lucide-react';

interface HeaderProps {
    title: string;
    breadcrumb?: string;
}

export default function Header({ title, breadcrumb }: HeaderProps) {
    return (
        <header className="h-[68px] bg-white border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                {breadcrumb && <span className="text-xs text-muted-foreground">{breadcrumb}</span>}
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border transition-all focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/10 min-w-[240px]">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Поиск..."
                        className="border-none bg-transparent text-[13px] text-foreground w-full outline-none placeholder:text-muted-foreground"
                    />
                </div>
                <button className="relative w-10 h-10 rounded-full flex items-center justify-center bg-background border border-border cursor-pointer transition-all hover:border-primary hover:bg-primary/5">
                    <Bell className="w-[18px] h-[18px] text-foreground" />
                    <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        3
                    </span>
                </button>
            </div>
        </header>
    );
}
