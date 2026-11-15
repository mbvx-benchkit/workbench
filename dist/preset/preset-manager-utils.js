/**
 * WORKBENCH: preset manager UI helpers and state types.
 * Consolidated from Stage-1 mechanical helper splits.
 */
/* =========================================================
   DOM Utility
   ========================================================= */
export function requireElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`必要な要素が見つかりません: ${selector}`);
    }
    return element;
}
/* =========================================================
   Format
   ========================================================= */
export function formatBytes(bytes) {
    if (bytes <
        1024) {
        return `${bytes} B`;
    }
    const kilobytes = bytes /
        1024;
    if (kilobytes <
        1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }
    const megabytes = kilobytes /
        1024;
    if (megabytes <
        1024) {
        return `${megabytes.toFixed(1)} MB`;
    }
    const gigabytes = megabytes /
        1024;
    return `${gigabytes.toFixed(2)} GB`;
}
//# sourceMappingURL=preset-manager-utils.js.map