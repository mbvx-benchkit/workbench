/**
 * localStorage.setItemは保存失敗時に以前の値を保持する。
 * 保存エラー時も古い作業内容をremoveItemで消さないことを保証する。
 */
export function persistAutosave(
    storage: Pick<Storage, "setItem">,
    key: string,
    serialized: string
): void {
    storage.setItem(key, serialized);
}
