export interface DashboardStats {
    total_tickets: number;
    routed_tickets: number;
    pending_tickets: number;
    avg_priority: number;
    avg_confidence: number;
    vip_count: number;
    unknown_geo_count: number;
    // Extended fields for UI (computed/mock)
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
