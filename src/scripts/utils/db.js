const DB_NAME = 'storyDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

let dbInstance;

/**
 * Open (and initialize if needed) IndexedDB
 */
export function openDB() {
	if (dbInstance) return Promise.resolve(dbInstance);

	return new Promise((resolve, reject) => {
		try {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				console.log('[IndexedDB] onupgradeneeded', DB_NAME, 'version', DB_VERSION);
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
					console.log(`[IndexedDB] Created object store: ${STORE_NAME}`);
				}
			};

			request.onsuccess = (event) => {
				dbInstance = event.target.result;
				dbInstance.onversionchange = () => {
					console.warn('[IndexedDB] DB version change detected, closing connection.');
					dbInstance.close();
					dbInstance = null;
				};
				console.log('[IndexedDB] Opened DB:', DB_NAME);
				resolve(dbInstance);
			};

			request.onerror = (event) => {
				console.error('[IndexedDB] Failed to open DB:', event.target.error);
				reject(event.target.error);
			};

			request.onblocked = () => {
				console.warn('[IndexedDB] open() request is blocked. Close other tabs accessing this DB.');
			};
		} catch (err) {
			console.error('[IndexedDB] openDB threw', err);
			reject(err);
		}
	});
}

/**
 * Add a new draft object
 */
export async function addDraft(data) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		try {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const req = store.add({ ...data, createdAt: Date.now() });

			req.onsuccess = () => {
				console.log('[IndexedDB] Draft added, id:', req.result);
				resolve(req.result);
			};
			req.onerror = () => {
				console.error('[IndexedDB] addDraft error:', req.error);
				reject(req.error);
			};
		} catch (err) {
			console.error('[IndexedDB] addDraft exception:', err);
			reject(err);
		}
	});
}

/**
 * Debug helper: add a quick test draft (useful from DevTools)
 * Usage in console: await window.addTestDraft('hello')
 */
export async function addTestDraft(text) {
  try {
    const id = await addDraft({ text });
    console.log('[IndexedDB] addTestDraft id:', id);
    return id;
  } catch (err) {
    console.error('[IndexedDB] addTestDraft error:', err);
    throw err;
  }
}

/**
 * Get all drafts
 */
export async function getAllDrafts() {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		try {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const req = store.getAll();

			req.onsuccess = () => {
				const result = req.result || [];
				console.log(`[IndexedDB] getAllDrafts returned ${result.length} items`);
				resolve(result);
			};
			req.onerror = () => {
				console.error('[IndexedDB] getAllDrafts error:', req.error);
				reject(req.error);
			};
		} catch (err) {
			console.error('[IndexedDB] getAllDrafts exception:', err);
			reject(err);
		}
	});
}

/**
 * Delete a draft by id
 */
export async function deleteDraft(id) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		try {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const req = store.delete(id);

			req.onsuccess = () => {
				console.log('[IndexedDB] deleteDraft success id:', id);
				resolve(true);
			};
			req.onerror = () => {
				console.error('[IndexedDB] deleteDraft error:', req.error);
				reject(req.error);
			};
		} catch (err) {
			console.error('[IndexedDB] deleteDraft exception:', err);
			reject(err);
		}
	});
}

/**
 * Backward-compat alias to match existing imports:
 * sync.js imports `deleteNote` — map it to `deleteDraft` to stop warnings.
 */
export const deleteNote = deleteDraft;

/**
 * Backward-compat alias to match existing imports:
 * sync.js imports `getAllNotes` — map it to `getAllDrafts` to stop warnings.
 */
export const getAllNotes = getAllDrafts;
