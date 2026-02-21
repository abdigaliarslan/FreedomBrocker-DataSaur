import api from './client';
import type { PaginatedResponse } from '@/types/common';
import type { Ticket, TicketWithDetails } from '@/types/models';

export async function fetchTickets(params: Record<string, unknown>) {
    const { data } = await api.get<PaginatedResponse<Ticket>>('/tickets', { params });
    return data;
}

export async function fetchTicketDetail(id: string): Promise<TicketWithDetails> {
    const { data } = await api.get<{ data: TicketWithDetails }>(`/tickets/${id}`);
    return data.data;
}

export async function updateTicketStatus(id: string, status: string) {
    const { data } = await api.patch(`/tickets/${id}/status`, { status });
    return data;
}

export async function enrichTicket(id: string) {
    const { data } = await api.post(`/tickets/${id}/enrich`);
    return data;
}

export async function enrichAllTickets() {
    const { data } = await api.post('/tickets/enrich-all');
    return data;
}
