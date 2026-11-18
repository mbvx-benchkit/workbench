import { withWorkbenchWriteLock } from "./workbench-data-lock.js";
import { cloneRedIndexData, createInitialData, parseRedIndexData } from "./model.js";
/* =========================================================
   Local Storage
   ========================================================= */
const STORAGE_KEY = "workbench.red-index.v1";
/* =========================================================
   Load
   ========================================================= */
export function loadRedIndexData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored ===
            null) {
            return createInitialData();
        }
        const parsed = JSON.parse(stored);
        return parseRedIndexData(parsed);
    }
    catch (error) {
        console.warn("RED INDEXの保存データを読み込めませんでした。", error);
        return createInitialData();
    }
}
/* =========================================================
   Save
   ========================================================= */
/**
 * 入力変更のたびに呼び出す。
 *
 * RED INDEXでは保存ボタンを用意せず、
 * 現在の入力状態を常に保存する。
 */
let lastWrite = Promise.resolve();
export function saveRedIndexData(data) {
    // Copy immediately: a later input event may mutate the live editor model.
    const safeData = cloneRedIndexData(data);
    const serialized = JSON.stringify(safeData);
    const next = lastWrite.catch(() => { }).then(() => withWorkbenchWriteLock(() => {
        localStorage.setItem(STORAGE_KEY, serialized);
    }));
    lastWrite = next;
    return next;
}
/** Import must not replace the live editing model until the new state is durable. */
export async function commitImportedRedIndexData(imported, activate) {
    await saveRedIndexData(imported);
    activate(imported);
}
//# sourceMappingURL=storage.js.map