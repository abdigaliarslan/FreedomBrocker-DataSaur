export interface Ticket {
    id: string;
    subject: string;
    description: string;
    status: 'new' | 'enriching' | 'enriched' | 'open' | 'progress' | 'resolved' | 'closed' | 'routed' | string;
    priority: 'low' | 'medium' | 'high';
    sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
    segment: string;
    type: string;
    lang: string;
    manager_id?: string;
    office_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Manager {
    id: string;
    name: string;
    role: string;
    office_id: string;
    active_tickets: number;
    resolved_tickets: number;
    rating: number;
}

export interface Office {
    id: string;
    name: string;
    address: string;
    city: string;
    manager_count: number;
    active_tickets: number;
}
