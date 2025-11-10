import registerSW, { disableNotifications } from './sw-register';

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

async function subscribeIfPossible() {
	await registerSW(); 
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
		btn.textContent = 'Subscribe Cerita Baru';
		// ensure visual parity with Push Test Lokal button
		btn.classList.add('btn');
		btn.style.display = 'inline-block'; // make sure it shows
		btn.style.marginLeft = '10px';
		header.appendChild(btn);
	}
	return btn;
}

async function refreshButtonState(btn) {
	const subscribed = await isSubscribed();
	btn.textContent = subscribed ? 'Unsubscribe Cerita Baru' : 'Subscribe Cerita Baru';
	btn.dataset.subscribed = subscribed ? '1' : '0';
}

async function onToggleClick(e) {
	const btn = e.currentTarget;
	const subscribed = btn.dataset.subscribed === '1';

	if (subscribed) {
		await disableNotifications();
	} else {
		await subscribeIfPossible();
	}
	await refreshButtonState(btn);
}

export async function initNotificationUI() {
	const btn = ensureSubscribeButton();
	if (!btn) return;

	btn.removeEventListener('click', onToggleClick);
	btn.addEventListener('click', onToggleClick);

	await refreshButtonState(btn);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => initNotificationUI());
} else {
	initNotificationUI();
}