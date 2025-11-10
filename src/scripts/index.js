import '../styles/styles.css';
import App from './pages/app';

// --- INISIALISASI APP ---
document.addEventListener('DOMContentLoaded', async () => {
  if (!location.hash || location.hash === '') {
    location.hash = '/';
  }

  function hideElementSafely(el) {
    if (!el || el.dataset.hiddenByScript) return;
    try {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.dataset.hiddenByScript = '1';
    } catch (err) {
      console.warn('hideElementSafely failed', err);
    }
  }

  function removeExtraHeaders() {
    const headers = Array.from(document.querySelectorAll('header'));
    if (headers.length <= 1) return;
    headers.slice(1).forEach(h => hideElementSafely(h));
  }

  function removeDuplicateIds() {
    const all = Array.from(document.querySelectorAll('[id]'));
    const seen = new Set();
    for (const el of all) {
      const id = el.id;
      if (!id) continue;
      if (!seen.has(id)) {
        seen.add(id);
        continue;
      }
      hideElementSafely(el);
    }
  }

  removeExtraHeaders();
  removeDuplicateIds();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        try {
          if (!(node instanceof Element)) continue;

          if (node.closest && node.closest('#webpack-dev-server-client-overlay, .webpack-dev-server-client-overlay')) {
            continue;
          }

          if (node.tagName && node.tagName.toLowerCase() === 'header') {
            const headers = document.querySelectorAll('header');
            if (headers.length > 1) {
              hideElementSafely(node);
            }
            continue;
          }

          if (node.hasAttribute && node.hasAttribute('id')) {
            const id = node.getAttribute('id');
            if (id) {
              const elems = document.querySelectorAll(`#${CSS.escape(id)}`);
              if (elems.length > 1) {
                if (elems[0] !== node) {
                  hideElementSafely(node);
                }
              }
            }
          }

          const headersInSubtree = node.querySelectorAll ? node.querySelectorAll('header') : [];
          if (headersInSubtree.length) {
            headersInSubtree.forEach(h => {
              const headers = document.querySelectorAll('header');
              if (headers.length > 1) hideElementSafely(h);
            });
          }

          const idsInSubtree = node.querySelectorAll ? node.querySelectorAll('[id]') : [];
          if (idsInSubtree.length) {
            idsInSubtree.forEach(el => {
              const id = el.id;
              if (!id) return;
              const elems = document.querySelectorAll(`#${CSS.escape(id)}`);
              if (elems.length > 1 && elems[0] !== el) hideElementSafely(el);
            });
          }
        } catch (err) {
        }
      }
    }
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  });


  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  const PUBLIC_VAPID_KEY =
    'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  async function registerSW() {
    if (!('serviceWorker' in navigator)) {
      alert('Service Worker tidak didukung oleh browser ini.');
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.error('Gagal registrasi Service Worker:', err);
      alert('Gagal registrasi service worker.');
      return null;
    }
  }

  async function isSubscribed() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }

  async function sendSubscriptionToServer(subscription) {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Silakan login untuk mendaftarkan subscription di server.');
      return false;
    }
    try {
      const { endpoint, keys } = subscription.toJSON();
      const res = await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        }),
      });
      const data = await res.json();
      if (!data.error) {
        return true;
      }
      console.error('Server subscribe error:', data);
      return false;
    } catch (err) {
      console.error('Gagal kirim subscription ke server:', err);
      return false;
    }
  }

  async function subscribeUser() {
    const permission = await Notification.requestPermission().catch(() => 'denied');
    if (permission !== 'granted') {
      alert('Izin notifikasi ditolak.');
      return;
    }

    const reg = await registerSW();
    if (!reg) return;

    try {
      const appServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
      const ok = await sendSubscriptionToServer(subscription);
      if (ok) {
        alert('Berhasil subscribe notifikasi cerita baru!');
        refreshSubscribeButton();
      } else {
        alert('Gagal mendaftarkan subscription ke server.');
      }
    } catch (err) {
      console.error('subscribeUser error', err);
      alert('Gagal subscribe: ' + (err && err.message));
    }
  }

  async function unsubscribeUser() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        alert('Belum berlangganan.');
        return;
      }
      await sub.unsubscribe();
      alert('Berhasil unsubscribe.');
      refreshSubscribeButton();
    } catch (err) {
      console.error('unsubscribeUser error', err);
      alert('Gagal unsubscribe.');
    }
  }

  async function refreshSubscribeButton() {
    const btn = document.getElementById('btn-subscribe');
    if (!btn) return;
    const subscribed = await isSubscribed();
    btn.textContent = subscribed ? 'Unsubscribe' : 'Subscribe ke Story Baru';
    btn.dataset.subscribed = subscribed ? '1' : '0';
  }

  async function testPushLocal() {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        const p = await Notification.requestPermission().catch(() => 'denied');
        if (p !== 'granted') {
          alert('Izin notifikasi diperlukan untuk tes push lokal.');
          return;
        }
      }

      const reg = await registerSW();
      if (!reg || !reg.active) {
        alert('Service Worker belum aktif.');
        return;
      }
      reg.active.postMessage({ type: 'push-mock', data: { title: 'Tes Push Lokal', body: 'Ini notifikasi lokal' } });
      alert('Mengirim tes push lokal (seharusnya muncul dari Service Worker).');
    } catch (err) {
      console.error('testPushLocal error', err);
      alert('Gagal kirim tes push lokal: ' + err.message);
    }
  }

  const subscribeBtn = document.getElementById('btn-subscribe');
  const pushTestBtn = document.getElementById('btn-push-test');

  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', async () => {
      const isSub = subscribeBtn.dataset.subscribed === '1';
      if (isSub) {
        await unsubscribeUser();
      } else {
        await subscribeUser();
      }
    });
  }

  if (pushTestBtn) {
    pushTestBtn.addEventListener('click', async () => {
      await testPushLocal();
    });
  }

  refreshSubscribeButton();
  // --- end NEW ---
});