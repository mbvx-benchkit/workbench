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
export async function saveActiveTemplateId(storageKey: string, id: string | null): Promise<void> {
    await withWorkbenchWriteLock(() => {

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
    });
}
