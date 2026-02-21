export interface Ticket {
  id: string
  external_id: string | null
  subject: string
  body: string
  client_name: string | null
  client_segment: string | null
  source_channel: string | null
  status: string
  raw_address: string | null
  created_at: string
  updated_at: string
}

export interface TicketAI {
  id: string
  ticket_id: string
  type: string | null
  sentiment: string | null
  priority_1_10: number | null
  lang: string
  summary: string | null
  recommended_actions: string[]
  lat: number | null
  lon: number | null
  geo_status: string
  confidence_type: number | null
  confidence_sentiment: number | null
  confidence_priority: number | null
  enriched_at: string | null
}

export interface TicketAssignment {
  id: string
  ticket_id: string
  manager_id: string
  business_unit_id: string
  assigned_at: string
  routing_reason: string | null
  is_current: boolean
}

export interface AuditLog {
  id: string
  ticket_id: string
  step: string
  input_data: unknown
  output_data: unknown
  decision: string
  candidates: string[] | null
  created_at: string
}

export interface TicketWithDetails {
  ticket: Ticket
  ai: TicketAI | null
  assignment: TicketAssignment | null
  assigned_manager: Manager | null
  audit_trail: AuditLog[]
}

export interface Manager {
  id: string
  full_name: string
  email: string | null
  business_unit_id: string
  is_vip_skill: boolean
  is_chief_spec: boolean
  languages: string[]
  max_load: number
  current_load: number
  is_active: boolean
  created_at: string
}

export interface ManagerWithOffice extends Manager {
  office_name: string
  office_city: string
  utilization_pct: number
}
