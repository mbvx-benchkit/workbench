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
export function saveActiveTemplateId(storageKey: string, id: string | null): void {

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

    } catch {

        /*
         * localStorage不可でも
         * 文書作成機能自体は継続する。
         */
    }
}
