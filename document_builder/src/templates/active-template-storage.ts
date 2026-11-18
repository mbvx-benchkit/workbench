import { withWorkbenchWriteLock } from "../workbench-data-lock.js";
/** Last-selected template persistence. Unavailable localStorage remains nonfatal. */
export function getSavedActiveTemplateId(storageKey: string): string | null {

    try {

        return localStorage.getItem(
            storageKey
        );

    } catch {

        return null;
    }
}
// A shared Web Lock prevents restores, but it does not serialize peer writers.
// Chain requests in call order so a slow earlier write cannot win over a newer selection.
let lastSelectionWrite: Promise<void> = Promise.resolve();
export function saveActiveTemplateId(storageKey: string, id: string | null): Promise<void> {
    const next = lastSelectionWrite.catch(() => {}).then(() => withWorkbenchWriteLock(() => {

    try {

        if (
            id
        ) {

            localStorage.setItem(
                storageKey,
                id
            );


            return;
        }


        localStorage.removeItem(
            storageKey
        );

    } catch (error) {
        console.warn("使用中テンプレートの保存に失敗しました。", error);
        throw error;
    }
    }));
    lastSelectionWrite = next;
    return next;
}
