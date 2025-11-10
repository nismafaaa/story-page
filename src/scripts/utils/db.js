const DB_NAME = 'storyDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

let dbInstance;

export function openDB() {
	if (dbInstance) return Promise.resolve(dbInstance);

	return new Promise((resolve, reject) => {
		const tryOpen = (version) => {
			try {
				const request = indexedDB.open(DB_NAME, version);

				request.onupgradeneeded = (event) => {
					const db = event.target.result;
					console.log('[IndexedDB] onupgradeneeded', DB_NAME, 'version', event.oldVersion, '->', db.version);
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

					if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
						try {
							const newVersion = dbInstance.version + 1;
							dbInstance.close();
							dbInstance = null;
							tryOpen(newVersion);
							return;
						} catch (err) {
							reject(err);
							return;
						}
					}

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
		};

		tryOpen(DB_VERSION);
	});
}

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

export async function addDrafts(records = []) {
	if (!Array.isArray(records) || records.length === 0) return Promise.resolve(true);
	const db = await openDB();
	return new Promise((resolve, reject) => {
		try {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);

			for (const rec of records) {
				store.add({ ...rec, createdAt: rec.createdAt || Date.now() });
			}

			tx.oncomplete = () => {
				console.log('[IndexedDB] addDrafts complete, count:', records.length);
				resolve(true);
			};
			tx.onerror = () => {
				console.error('[IndexedDB] addDrafts tx error:', tx.error);
				reject(tx.error);
			};
		} catch (err) {
			console.error('[IndexedDB] addDrafts exception:', err);
			reject(err);
		}
	});
}

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

export const deleteNote = deleteDraft;
export const getAllNotes = getAllDrafts;
