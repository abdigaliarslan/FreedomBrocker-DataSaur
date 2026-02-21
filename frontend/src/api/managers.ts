import api from './client';
import type { Manager } from '@/types/models';

export async function fetchManagers() {
    const { data } = await api.get<Manager[]>('/managers');
    return data;
}
