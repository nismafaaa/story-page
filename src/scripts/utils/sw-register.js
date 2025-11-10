let initialized = false;

function urlBase64ToUint8Array(base64String) {
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
		const reg = await navigator.serviceWorker.register('/service-worker.js');
		const readyReg = await navigator.serviceWorker.ready;
		console.log('✅ Service Worker ready', readyReg);

		if ('PushManager' in window) {
			const permission = await Notification.requestPermission().catch(() => 'denied');
			if (permission !== 'granted') {
				console.warn('⚠️ Notification permission not granted; skipping push subscribe.');
				return;
			}

			const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk'; 
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
		}
	} catch (err) {
		console.error('❌ Service Worker registration failed:', err);
	}
}

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
		if (!sub) return true; 
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
