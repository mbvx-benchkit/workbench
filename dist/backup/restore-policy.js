/** v1 archives do not contain PDF history. Never delete it on v1 restore. */
export function createRestoredSnapshot(imported, current) {
    return {
        documentTemplates: imported.documentTemplates,
        redIndex: imported.redIndex,
        presetDocuments: imported.presetDocuments,
        printHistory: imported.sourceBackupVersion === 1
            ? current.printHistory
            : imported.printHistory,
        historyVaultConfig: imported.sourceBackupVersion === 1
            ? current.historyVaultConfig
            : imported.historyVaultConfig
    };
}
//# sourceMappingURL=restore-policy.js.map