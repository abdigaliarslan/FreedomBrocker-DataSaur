import api from './client';
import type { PaginatedResponse } from '@/types/common';
import type { Ticket } from '@/types/models';

export async function fetchTickets(params: any) {
    const { data } = await api.get<PaginatedResponse<Ticket>>('/tickets', { params });
    return data;
}

export async function updateTicketStatus(id: string, status: string) {
    const { data } = await api.patch(`/tickets/${id}/status`, { status });
    return data;
}
