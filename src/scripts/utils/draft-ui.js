import { addDraft as addDraftDB, getAllDrafts as getAllDraftsDB, deleteDraft as deleteDraftDB } from './db.js';

export async function addDraft(draft) {
  return await addDraftDB(draft);
}

export async function getAllDrafts() {
  return await getAllDraftsDB();
}

export async function deleteDraft(id) {
  return await deleteDraftDB(id);
}

(async () => {
  try {
    const drafts = await getAllDrafts();
    console.log('Drafts (from unified DB):', drafts);
  } catch (err) {
    console.error('Failed to read drafts on import:', err);
  }
})();

