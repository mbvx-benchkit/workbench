/** Last-selected template persistence. Unavailable localStorage remains nonfatal. */
export function getSavedActiveTemplateId(storageKey) {
    try {
        return localStorage.getItem(storageKey);
    }
    catch {
        return null;
    }
}
export function saveActiveTemplateId(storageKey, id) {
    try {
        if (id) {
            localStorage.setItem(storageKey, id);
            return;
        }
        localStorage.removeItem(storageKey);
    }
    catch {
        /*
         * localStorage不可でも
         * 文書作成機能自体は継続する。
         */
    }
}
//# sourceMappingURL=active-template-storage.js.map