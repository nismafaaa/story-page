let initialized = false;

async function registerSW() {
	if (initialized) return;
	initialized = true;

	if (!('serviceWorker' in navigator)) {
		console.warn('❌ Service Worker not supported in this browser.');
		return;
	}

	try {
		const reg = await navigator.serviceWorker.register('/service-worker.js');
		await navigator.serviceWorker.ready;
		console.log('✅ Service Worker registered and ready', reg);
	} catch (err) {
		console.error('❌ Service Worker registration failed:', err);
	}
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
