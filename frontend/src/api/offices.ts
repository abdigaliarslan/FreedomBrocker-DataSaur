import api from './client';
import type { Office } from '@/types/models';

export async function fetchOffices(): Promise<Office[]> {
    const { data } = await api.get<{ data: Office[] }>('/offices');
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
}
