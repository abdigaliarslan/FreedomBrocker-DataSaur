export interface DashboardStats {
    total_tickets: number;
    active_managers: number;
    total_offices: number;
    ai_processed_count: number;
    tickets_change_pct: number;
}

export interface SentimentData {
    sentiment: string;
    count: number;
}

export interface TimelineData {
    date: string;
    count: number;
}
