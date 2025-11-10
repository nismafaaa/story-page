/* Safe SW + Push registration for dev/prod */
let initialized = false;

function urlBase64ToUint8Array(base64String) {
	// If you have a VAPID public key, set it here; otherwise we won't subscribe.
	if (!base64String) return null;
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
	return outputArray;
}

async function registerSW() {
	if (initialized) return;
	initialized = true;

	if (!('serviceWorker' in navigator)) {
		console.warn('❌ Service Worker not supported in this browser.');
		return;
	}

	try {
		// Register SW at scope root. Ensure /service-worker.js is served by dev/prod server.
		const reg = await navigator.serviceWorker.register('/service-worker.js');
		// Wait for an active/ready controller before using PushManager.
		const readyReg = await navigator.serviceWorker.ready;
		console.log('✅ Service Worker ready', readyReg);

		// Optional: Push subscription
		if ('PushManager' in window) {
			const permission = await Notification.requestPermission().catch(() => 'denied');
			if (permission !== 'granted') {
				console.warn('⚠️ Notification permission not granted; skipping push subscribe.');
				return;
			}

			// If you have a VAPID key, put it here; else skip subscription quietly in dev.
			const VAPID_PUBLIC_KEY = ''; // e.g. 'BExxxxxxxx'
			const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

			if (!appServerKey) {
				console.info('ℹ️ No VAPID key configured; skipping push subscription.');
				return;
			}

			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: appServerKey,
			});
			console.log('✅ Push subscribed:', sub);
			// TODO: send `sub` to your backend if needed
		}
	} catch (err) {
		console.error('❌ Service Worker registration failed:', err);
	}
}

// Defer until full load to avoid race with dev server boot.
if (typeof window !== 'undefined') {
	window.addEventListener('load', () => {
		registerSW();
	});
}

export async function disableNotifications() {
	if (!('serviceWorker' in navigator)) return false;
	try {
		const reg = await navigator.serviceWorker.getRegistration();
		if (!reg || !reg.pushManager) return false;
		const sub = await reg.pushManager.getSubscription();
		if (!sub) return true; // already disabled
		await sub.unsubscribe();
		console.log('🔕 Push subscription removed');
		return true;
	} catch (err) {
		console.warn('Failed to disable notifications:', err);
		return false;
	}
}

export async function getSubscription() {
	if (!('serviceWorker' in navigator)) return null;
	try {
		const reg = await navigator.serviceWorker.getRegistration();
		if (!reg || !reg.pushManager) return null;
		return await reg.pushManager.getSubscription();
	} catch {
		return null;
	}
}

export default registerSW;
