import { getAllNotes, deleteNote } from './db.js';
import CONFIG from '../config.js';

const API_URL = `${CONFIG.BASE_URL}/stories`;

export async function syncOfflineData() {
  if (!navigator.onLine) return;

  const offlineNotes = await getAllNotes();

  for (const note of offlineNotes) {
    try {
      const token = localStorage.getItem('token') || '';

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: note.text, description: note.text }),
      });

      if (response.ok) {
        await deleteNote(note.id);
      } else {
        console.warn('Sync failed for note id', note.id, 'status', response.status);
      }
    } catch (err) {
      console.error('Gagal sinkronisasi:', err);
    }
  }
}

window.addEventListener('online', () => {
  console.log('Koneksi internet tersedia, mulai sinkronisasi...');
  syncOfflineData();
});
