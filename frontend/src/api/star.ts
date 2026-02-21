import api from './client';

export async function queryStar(query: string) {
    const { data } = await api.post('/star/query', { query });
    return data;
}
