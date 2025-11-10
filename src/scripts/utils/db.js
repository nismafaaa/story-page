const DB_NAME = 'storyDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

let dbInstance;

/**
 * Open (and initialize if needed) IndexedDB
 */
export function openDB() {
	// Reuse a single instance to avoid flickers/race conditions
	if (dbInstance) return Promise.resolve(dbInstance);

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
			}
		};

		request.onsuccess = (event) => {
			dbInstance = event.target.result;
			resolve(dbInstance);
		};

		request.onerror = (event) => reject(event.target.error);
	});
}

/**
 * Add a new draft object
 */
export async function addDraft(data) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const req = store.add({ ...data, createdAt: Date.now() });

		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/**
 * Get all drafts
 */
export async function getAllDrafts() {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const req = store.getAll();

		req.onsuccess = () => resolve(req.result || []);
		req.onerror = () => reject(req.error);
	});
}

/**
 * Delete a draft by id
 */
export async function deleteDraft(id) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const req = store.delete(id);

		req.onsuccess = () => resolve(true);
		req.onerror = () => reject(req.error);
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
