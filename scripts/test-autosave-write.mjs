import assert from 'node:assert/strict';
import { persistAutosave } from '../gosplan13/dist/autosave-write.js';
let saved = 'PREVIOUS_DATA';
const storage = {
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => { throw new Error('NEVER CALLED'); }
};
await assert.rejects(async () => persistAutosave(storage, 'gosplan13.autosave.v1', 'NEW_DATA'), /QuotaExceeded/);
assert.equal(saved, 'PREVIOUS_DATA');
const successful = { setItem: (_key, value) => { saved = value; } };
persistAutosave(successful, 'gosplan13.autosave.v1', 'NEW_DATA');
assert.equal(saved, 'NEW_DATA');
console.log('PASS: autosave failure preserves previous data; next successful save updates it');
