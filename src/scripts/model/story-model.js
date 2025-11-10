const BASE_URL = 'https://story-api.dicoding.dev/v1';

export default class StoryModel {
  constructor() {
  }

  async getStories(page = 1, size = 20) {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token belum tersedia. Login dulu sebelum fetch stories.');
      return [];
    }
    try {
      const response = await fetch(`${BASE_URL}/stories?location=1&page=${page}&size=${size}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.error) {
        console.error('Gagal ambil stories:', data.message);
        return [];
      }
      return data.listStory || [];
    } catch (err) {
      console.error('Terjadi kesalahan fetch stories:', err);
      return [];
    }
  }

  async addStory(formData) {
    const token = localStorage.getItem('token');
    if (!token) {
      return { error: true, message: 'Token tidak ditemukan. Silakan login dulu.' };
    }
    try {
      const response = await fetch(`${BASE_URL}/stories`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      return await response.json();
    } catch (err) {
      console.error('Gagal menambah story:', err);
      return { error: true, message: err.message };
    }
  }
}
