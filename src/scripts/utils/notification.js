import registerSW, { disableNotifications } from './sw-register';

// Helper: check current push subscription status
async function isSubscribed() {
	try {
		if (!('serviceWorker' in navigator)) return false;
		const reg = await navigator.serviceWorker.getRegistration();
		if (!reg || !reg.pushManager) return false;
		const sub = await reg.pushManager.getSubscription();
		return !!sub;
	} catch {
		return false;
	}
}

// Helper: try to subscribe (no-op if VAPID key not configured in sw-register.js)
async function subscribeIfPossible() {
	await registerSW(); // ensures SW is ready; will subscribe only if VAPID is configured
	return isSubscribed();
}

function ensureSubscribeButton() {
	const header = document.querySelector('.main-header');
	if (!header) return null;

	let btn = document.getElementById('btn-subscribe');
	if (!btn) {
		btn = document.createElement('button');
		btn.id = 'btn-subscribe';
		btn.type = 'button';
		btn.textContent = 'Subscribe to notifications';
		btn.style.display = 'inline-block'; // make sure it shows
		btn.style.marginLeft = '10px';
		header.appendChild(btn);
	}
	return btn;
}

async function refreshButtonState(btn) {
	const subscribed = await isSubscribed();
	btn.textContent = subscribed ? 'Unsubscribe notifications' : 'Subscribe to notifications';
	btn.dataset.subscribed = subscribed ? '1' : '0';
}

async function onToggleClick(e) {
	const btn = e.currentTarget;
	const subscribed = btn.dataset.subscribed === '1';

	if (subscribed) {
		await disableNotifications();
	} else {
		// ask permission if needed; registerSW() handles permission + SW readiness
		await subscribeIfPossible();
	}
	await refreshButtonState(btn);
}

export async function initNotificationUI() {
	const btn = ensureSubscribeButton();
	if (!btn) return;

	// avoid attaching multiple listeners
	btn.removeEventListener('click', onToggleClick);
	btn.addEventListener('click', onToggleClick);

	await refreshButtonState(btn);
}

// Auto-init on DOM ready (keeps it idempotent)
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => initNotificationUI());
} else {
	initNotificationUI();
}
