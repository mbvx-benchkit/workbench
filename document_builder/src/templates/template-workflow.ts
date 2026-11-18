/** Template import, create, update and selection workflow. Screen state stays in main.ts. */
import { addTemplate, getTemplate, putTemplate } from "../template-db.js";
import { readDocumentPackageFile } from "../template-import.js";
import type { DocumentTemplate, DocumentValues } from "../template.js";
import type { TemplateBuilderMode } from "../template-builder.js";

export interface TemplateWorkflowDeps {
    jsonImportInput: HTMLInputElement;
    templateAddInput: HTMLInputElement;
    templateSelect: HTMLSelectElement;
    readonly activeTemplate: DocumentTemplate | null;
    readonly activeValues: DocumentValues;
    refreshTemplateCollections: () => Promise<void>;
    applyTemplate: (template: DocumentTemplate, values?: DocumentValues) => void;
    clearActiveTemplate: () => void;
    showToast: (message: string) => void;
    getErrorMessage: (error: unknown) => string;
}

export function createTemplateWorkflow(deps: TemplateWorkflowDeps) {
    const { jsonImportInput, templateAddInput, templateSelect, refreshTemplateCollections,
        applyTemplate, clearActiveTemplate, showToast, getErrorMessage } = deps;
    let selectionRequest = 0;

    // Once IndexedDB commits, a rendering failure is no longer a save failure.
    // Report the UI problem and return normally so the editor can close and
    // another submit cannot accidentally duplicate or overwrite the record.
    async function afterCommittedSave(
        template: DocumentTemplate,
        message: string,
        values?: DocumentValues,
        activate = true
    ): Promise<void> {
        try {
            await refreshTemplateCollections();
            if (activate) applyTemplate(template, values);
            showToast(message);
        } catch (error) {
            console.error("テンプレート保存後の画面更新に失敗しました。", error);
            showToast("テンプレートの保存は完了しましたが、画面を更新できませんでした。再読み込みしてください。");
        }
    }

    async function handleDocumentImport(): Promise<void> {
        const file = jsonImportInput.files?.[0];
        if (!file) return;
        try {
            const packageData = await readDocumentPackageFile(file);
            // A document archive is not an instruction to roll back the
            // currently installed template configuration.
            const existing = await getTemplate(packageData.template.id);
            if (existing) {
                applyTemplate(existing, packageData.values);
                showToast(packageData.values
                    ? "文書の入力内容を読み込みました。既存テンプレートの設定は変更していません。"
                    : "既存テンプレートを選択しました。設定は変更していません。");
                return;
            }
            await addTemplate(packageData.template);
            await afterCommittedSave(packageData.template,
                packageData.values ? "文書JSONを読み込みました。" : "テンプレートJSONを読み込みました。",
                packageData.values);
        } catch (error) {
            console.error("JSONインポートに失敗しました。", error);
            showToast(getErrorMessage(error));
        } finally {
            jsonImportInput.value = "";
        }
    }

    async function handleTemplateAddImport(): Promise<void> {
        const file = templateAddInput.files?.[0];
        if (!file) return;
        try {
            const packageData = await readDocumentPackageFile(file);
            if (await getTemplate(packageData.template.id)) {
                throw new Error("同じIDのテンプレートがすでに登録されています。既存テンプレートは「編集」を使用してください。");
            }
            await addTemplate(packageData.template);
            await afterCommittedSave(packageData.template, "テンプレートを追加しました。");
        } catch (error) {
            console.error("テンプレート追加に失敗しました。", error);
            showToast(getErrorMessage(error));
        } finally {
            templateAddInput.value = "";
        }
    }

    async function saveTemplateFromBuilder(template: DocumentTemplate, mode: TemplateBuilderMode): Promise<void> {
        if (mode === "create") {
            if (await getTemplate(template.id)) {
                throw new Error("同じIDのテンプレートがすでに存在します。");
            }
            await addTemplate(template);
            await afterCommittedSave(template, "テンプレートを登録しました。");
            return;
        }
        if (!await getTemplate(template.id)) {
            throw new Error("編集対象のテンプレートが見つかりません。");
        }
        const editingActiveTemplate = deps.activeTemplate?.id === template.id;
        const preservedValues = editingActiveTemplate ? deps.activeValues : undefined;
        await putTemplate(template);
        await afterCommittedSave(template, "テンプレートを更新しました。", preservedValues, editingActiveTemplate);
    }

    async function handleTemplateSelection(): Promise<void> {
        const id = templateSelect.value;
        const request = ++selectionRequest;
        if (!id) {
            clearActiveTemplate();
            return;
        }
        const template = await getTemplate(id);
        // An earlier asynchronous lookup may complete after a later choice.
        if (request !== selectionRequest || templateSelect.value !== id) return;
        if (!template) {
            await refreshTemplateCollections();
            if (request !== selectionRequest) return;
            clearActiveTemplate();
            showToast("選択したテンプレートを読み込めませんでした。");
            return;
        }
        applyTemplate(template);
    }
    return {handleDocumentImport, handleTemplateAddImport, saveTemplateFromBuilder, handleTemplateSelection};
}
