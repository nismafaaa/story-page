import '../styles/styles.css';
import './utils/notification';
import App from './pages/app';

// --- PUSH NOTIFICATION SETUP ---
const PUBLIC_VAPID_KEY =
  'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// ✅ Versi sesuai dokumentasi Dicoding
async function subscribeUser() {
  const token = localStorage.getItem('token'); // ambil token login dari localStorage

  if (!token) {
    alert('❌ Kamu harus login dulu untuk mengaktifkan notifikasi!');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    alert('❌ Browser kamu tidak mendukung Service Worker!');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Buat subscription baru
    const pushSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });

    const { endpoint, keys } = pushSubscription.toJSON();

    // Kirim ke API Dicoding dengan format yang benar
    const response = await fetch(
      'https://story-api.dicoding.dev/v1/notifications/subscribe',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        }),
      }
    );

    const result = await response.json();

    if (!result.error) {
      console.log('✅ Subscribe berhasil:', result);
      alert('Berhasil subscribe notifikasi cerita baru!');
    } else {
      console.error('❌ Subscribe gagal:', result.message);
      alert('Gagal subscribe notifikasi!');
    }
  } catch (err) {
    console.error('❌ Tidak bisa subscribe user:', err);
    alert('Gagal subscribe notifikasi!');
  }
}

// --- REGISTER SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch((err) => console.error('❌ Service Worker gagal register', err));
}

// --- INISIALISASI APP ---
document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  const header = document.querySelector('.main-header');
  if (header && !document.getElementById('btn-subscribe')) {
    const btn = document.createElement('button');
    btn.id = 'btn-subscribe';
    btn.textContent = 'Subscribe Cerita Baru';
    btn.style.marginLeft = '10px';
    btn.classList.add('btn');
    header.appendChild(btn);
  }

  const subscribeBtn = document.getElementById('btn-subscribe');
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', subscribeUser);
  }
});