export interface DashboardStats {
    total_tickets: number;
    routed_tickets: number;
    pending_tickets: number;
    avg_priority: number;
    avg_confidence: number;
    vip_count: number;
    unknown_geo_count: number;
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

export interface CategoryData {
    type: string;
    count: number;
}

export interface ManagerLoadData {
    manager_name: string;
    office: string;
    current_load: number;
    max_load: number;
    utilization_pct: number;
}
