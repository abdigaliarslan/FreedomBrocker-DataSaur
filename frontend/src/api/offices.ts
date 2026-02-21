import api from './client';
import type { Office } from '@/types/models';

export async function fetchOffices() {
    const { data } = await api.get<Office[]>('/offices');
    return data;
}
