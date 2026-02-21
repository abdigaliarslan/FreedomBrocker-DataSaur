import api from './client';
import type { Manager } from '@/types/models';

export async function fetchManagers(): Promise<Manager[]> {
    const { data } = await api.get<{ data: Manager[] }>('/managers');
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
}

export async function fetchManagerDetail(id: string): Promise<Manager> {
    const { data } = await api.get<{ data: Manager }>(`/managers/${id}`);
    return data.data;
}
