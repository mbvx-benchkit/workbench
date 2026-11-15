/** Template import, create, update and selection workflow. Screen state stays in main.ts. */
import { getTemplate, putTemplate } from "../template-db.js";
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
 const {jsonImportInput,templateAddInput,templateSelect,refreshTemplateCollections,
        applyTemplate,clearActiveTemplate,showToast,getErrorMessage}=deps;
async function handleDocumentImport():
    Promise<void> {

    const file =
        jsonImportInput.files?.[0];


    if (
        !file
    ) {

        return;
    }


    try {

        const packageData =
            await readDocumentPackageFile(
                file
            );


        await putTemplate(
            packageData.template
        );


        await refreshTemplateCollections();


        applyTemplate(
            packageData.template,
            packageData.values
        );


        showToast(
            packageData.values
                ? "文書JSONを読み込みました。"
                : "テンプレートJSONを読み込みました。"
        );

    } catch (
    error
    ) {

        console.error(
            "JSONインポートに失敗しました。",
            error
        );


        showToast(
            getErrorMessage(
                error
            )
        );

    } finally {

        jsonImportInput.value =
            "";
    }
}

async function handleTemplateAddImport():
    Promise<void> {

    const file =
        templateAddInput.files?.[0];


    if (
        !file
    ) {

        return;
    }


    try {

        const packageData =
            await readDocumentPackageFile(
                file
            );


        const existing =
            await getTemplate(
                packageData.template.id
            );


        if (
            existing
        ) {

            throw new Error(
                "同じIDのテンプレートがすでに登録されています。既存テンプレートは「編集」を使用してください。"
            );
        }


        await putTemplate(
            packageData.template
        );


        await refreshTemplateCollections();


        applyTemplate(
            packageData.template
        );


        showToast(
            "テンプレートを追加しました。"
        );

    } catch (
    error
    ) {

        console.error(
            "テンプレート追加に失敗しました。",
            error
        );


        showToast(
            getErrorMessage(
                error
            )
        );

    } finally {

        templateAddInput.value =
            "";
    }
}

async function saveTemplateFromBuilder(
    template: DocumentTemplate,
    mode: TemplateBuilderMode
): Promise<void> {

    if (
        mode ===
        "create"
    ) {

        const existing =
            await getTemplate(
                template.id
            );


        if (
            existing
        ) {

            throw new Error(
                "同じIDのテンプレートがすでに存在します。"
            );
        }


        await putTemplate(
            template
        );


        await refreshTemplateCollections();


        applyTemplate(
            template
        );


        showToast(
            "テンプレートを登録しました。"
        );


        return;
    }


    const existing =
        await getTemplate(
            template.id
        );


    if (
        !existing
    ) {

        throw new Error(
            "編集対象のテンプレートが見つかりません。"
        );
    }


    const editingActiveTemplate =
        deps.activeTemplate?.id ===
        template.id;


    const preservedValues =
        editingActiveTemplate
            ? deps.activeValues
            : undefined;


    await putTemplate(
        template
    );


    await refreshTemplateCollections();


    if (
        editingActiveTemplate
    ) {

        applyTemplate(
            template,
            preservedValues
        );
    }


    showToast(
        "テンプレートを更新しました。"
    );
}

async function handleTemplateSelection():
    Promise<void> {

    const id =
        templateSelect.value;


    if (
        !id
    ) {

        clearActiveTemplate();

        return;
    }


    const template =
        await getTemplate(
            id
        );


    if (
        !template
    ) {

        await refreshTemplateCollections();


        clearActiveTemplate();


        showToast(
            "選択したテンプレートを読み込めませんでした。"
        );


        return;
    }


    applyTemplate(
        template
    );
}
 return { handleDocumentImport, handleTemplateAddImport, saveTemplateFromBuilder, handleTemplateSelection };
}
