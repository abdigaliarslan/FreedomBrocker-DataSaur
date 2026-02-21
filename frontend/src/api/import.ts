import api from './client';

export async function importData(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}
