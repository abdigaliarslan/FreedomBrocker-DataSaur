/* ── Ticket ─────────────────────────────────────────────── */
export interface Ticket {
    id: string;
    external_id: string | null;
    subject: string;
    body: string;
    client_name: string | null;
    client_segment: string | null;
    source_channel: string | null;
    status: string;
    raw_address: string | null;
    attachments: string | null;
    created_at: string;
    updated_at: string;
}

/* ── Ticket AI enrichment ──────────────────────────────── */
export interface TicketAI {
    id: string;
    ticket_id: string;
    type: string | null;
    sentiment: string | null;
    priority_1_10: number | null;
    lang: string;
    summary: string | null;
    recommended_actions: string[] | null;
    lat: number | null;
    lon: number | null;
    geo_status: string;
    confidence_type: number | null;
    confidence_sentiment: number | null;
    confidence_priority: number | null;
    processing_ms: number | null;
    enriched_at: string | null;
    created_at: string;
}

/* ── Ticket Assignment ─────────────────────────────────── */
export interface TicketAssignment {
    id: string;
    ticket_id: string;
    manager_id: string;
    business_unit_id: string;
    assigned_at: string;
    routing_reason: string | null;
    is_current: boolean;
}

/* ── Audit Log ─────────────────────────────────────────── */
export interface AuditLog {
    id: string;
    ticket_id: string;
    step: string;
    input_data: unknown;
    output_data: unknown;
    decision: string;
    candidates: unknown;
    created_at: string;
}

/* ── Full ticket detail (GET /tickets/:id) ─────────────── */
export interface TicketWithDetails {
    ticket: Ticket;
    ai: TicketAI | null;
    assignment: TicketAssignment | null;
    assigned_manager: Manager | null;
    audit_trail: AuditLog[];
    geo_city: string | null;    // resolved city from geo_cache
    distance_km: number | null; // Haversine distance ticket→office (km)
}

/* ── Manager (with office info from GET /managers) ─────── */
export interface Manager {
    id: string;
    full_name: string;
    email: string | null;
    business_unit_id: string;
    is_vip_skill: boolean;
    is_chief_spec: boolean;
    languages: string[];
    max_load: number;
    current_load: number;
    is_active: boolean;
    created_at: string;
    office_name: string;
    office_city: string;
    utilization_pct: number;
}

/* ── Office / Business Unit ────────────────────────────── */
export interface Office {
    id: string;
    name: string;
    city: string;
    address: string | null;
    lat: number | null;
    lon: number | null;
    created_at: string;
}
