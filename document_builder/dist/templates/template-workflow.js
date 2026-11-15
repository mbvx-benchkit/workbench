/** Template import, create, update and selection workflow. Screen state stays in main.ts. */
import { getTemplate, putTemplate } from "../template-db.js";
import { readDocumentPackageFile } from "../template-import.js";
export function createTemplateWorkflow(deps) {
    const { jsonImportInput, templateAddInput, templateSelect, refreshTemplateCollections, applyTemplate, clearActiveTemplate, showToast, getErrorMessage } = deps;
    async function handleDocumentImport() {
        const file = jsonImportInput.files?.[0];
        if (!file) {
            return;
        }
        try {
            const packageData = await readDocumentPackageFile(file);
            await putTemplate(packageData.template);
            await refreshTemplateCollections();
            applyTemplate(packageData.template, packageData.values);
            showToast(packageData.values
                ? "文書JSONを読み込みました。"
                : "テンプレートJSONを読み込みました。");
        }
        catch (error) {
            console.error("JSONインポートに失敗しました。", error);
            showToast(getErrorMessage(error));
        }
        finally {
            jsonImportInput.value =
                "";
        }
    }
    async function handleTemplateAddImport() {
        const file = templateAddInput.files?.[0];
        if (!file) {
            return;
        }
        try {
            const packageData = await readDocumentPackageFile(file);
            const existing = await getTemplate(packageData.template.id);
            if (existing) {
                throw new Error("同じIDのテンプレートがすでに登録されています。既存テンプレートは「編集」を使用してください。");
            }
            await putTemplate(packageData.template);
            await refreshTemplateCollections();
            applyTemplate(packageData.template);
            showToast("テンプレートを追加しました。");
        }
        catch (error) {
            console.error("テンプレート追加に失敗しました。", error);
            showToast(getErrorMessage(error));
        }
        finally {
            templateAddInput.value =
                "";
        }
    }
    async function saveTemplateFromBuilder(template, mode) {
        if (mode ===
            "create") {
            const existing = await getTemplate(template.id);
            if (existing) {
                throw new Error("同じIDのテンプレートがすでに存在します。");
            }
            await putTemplate(template);
            await refreshTemplateCollections();
            applyTemplate(template);
            showToast("テンプレートを登録しました。");
            return;
        }
        const existing = await getTemplate(template.id);
        if (!existing) {
            throw new Error("編集対象のテンプレートが見つかりません。");
        }
        const editingActiveTemplate = deps.activeTemplate?.id ===
            template.id;
        const preservedValues = editingActiveTemplate
            ? deps.activeValues
            : undefined;
        await putTemplate(template);
        await refreshTemplateCollections();
        if (editingActiveTemplate) {
            applyTemplate(template, preservedValues);
        }
        showToast("テンプレートを更新しました。");
    }
    async function handleTemplateSelection() {
        const id = templateSelect.value;
        if (!id) {
            clearActiveTemplate();
            return;
        }
        const template = await getTemplate(id);
        if (!template) {
            await refreshTemplateCollections();
            clearActiveTemplate();
            showToast("選択したテンプレートを読み込めませんでした。");
            return;
        }
        applyTemplate(template);
    }
    return { handleDocumentImport, handleTemplateAddImport, saveTemplateFromBuilder, handleTemplateSelection };
}
//# sourceMappingURL=template-workflow.js.map