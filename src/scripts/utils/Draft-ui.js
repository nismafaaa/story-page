function noop() {}

/**
 * Render a single draft item element.
 * @param {Object} draft - { id, title, content, createdAt }
 * @returns {HTMLElement}
 */
export function renderDraftItem(draft = {}) {
	const el = document.createElement('div');
	el.className = 'draft-item';
	el.dataset.id = draft.id ?? '';
	el.innerHTML = `
		<strong>${(draft.title || 'Untitled').replace(/</g, '&lt;')}</strong>
		<div class="draft-meta">${new Date(draft.createdAt || Date.now()).toLocaleString()}</div>
		<p>${(draft.content || '').replace(/</g, '&lt;')}</p>
	`;
	return el;
}

/**
 * Clear all draft nodes from a container.
 * @param {HTMLElement} container
 */
export function clearDrafts(container) {
	if (!container) return;
	while (container.firstChild) container.removeChild(container.firstChild);
}

/**
 * Populate container with a list of drafts.
 * @param {HTMLElement} container
 * @param {Array<Object>} drafts
 */
export function showDrafts(container, drafts = []) {
	if (!container) return;
	clearDrafts(container);
	drafts.forEach(d => container.appendChild(renderDraftItem(d)));
}

const DraftUI = {
	showDrafts,
	clearDrafts,
	renderDraftItem,
};

export default DraftUI;
