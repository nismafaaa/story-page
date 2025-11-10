// CSS imports
import '../styles/styles.css';
import './utils/notification';
import App from './pages/app';
import { addTestDraft } from './utils/db.js';

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

async function subscribeUser() {
  const token = localStorage.getItem('token'); 
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

    const pushSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });

    const { endpoint, keys } = pushSubscription.toJSON();

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

  // --- Push Test Lokal (restore) ---
  if (header && !document.getElementById('btn-local-push')) {
    const btnLocal = document.createElement('button');
    btnLocal.id = 'btn-local-push';
    btnLocal.textContent = 'Push Test Lokal';
    btnLocal.style.marginLeft = '10px';
    btnLocal.classList.add('btn');
    header.appendChild(btnLocal);

    btnLocal.addEventListener('click', async () => {
      const payload = { title: 'Cerita baru!', body: 'Push test dari localhost' };

      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const target = navigator.serviceWorker.controller || reg.active || reg.waiting || reg.installing;
          if (target && typeof target.postMessage === 'function') {
            target.postMessage({ type: 'push-mock', data: payload });
            return;
          }
        }
      } catch (err) {
        console.warn('SW messaging failed, falling back to Notification:', err);
      }

      if (Notification.permission === 'granted') {
        new Notification(payload.title, { body: payload.body });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') new Notification(payload.title, { body: payload.body });
        });
      }
    });
  }

  // expose quick helper for manual testing in DevTools
  if (typeof window !== 'undefined') {
    window.addTestDraft = async function (text = 'test draft') {
      try {
        const id = await addTestDraft(text);
        console.log('addTestDraft created id:', id);
        return id;
      } catch (err) {
        console.error('addTestDraft failed:', err);
        throw err;
      }
    };

    window.inspectIndexedDB = async function () {
      if (indexedDB && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        console.log('IndexedDB databases:', dbs);
        return dbs;
      }
      console.warn('indexedDB.databases() is not supported in this browser.');
      return null;
    };
  }
});
