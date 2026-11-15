/** Individual template card rendering and its DOM callbacks. */
import { getReferencedFields, type DocumentTemplate } from "../template.js";
import { downloadTemplateJson } from "../template-import.js";

export interface TemplateCardDependencies {
    templateCardTemplate: HTMLTemplateElement;
    templateDeleteDialog: HTMLDialogElement;
    templateBuilder: { openEdit: (template: DocumentTemplate) => void };
    showToast: (message: string) => void;
    setPendingDeleteTemplateId: (id: string) => void;
    requireChild: <T extends Element>(container: Element, selector: string) => T;
}

export function createTemplateCardView(template: DocumentTemplate, deps: TemplateCardDependencies): HTMLElement {
    const { templateCardTemplate, templateDeleteDialog, templateBuilder, showToast,
        setPendingDeleteTemplateId, requireChild } = deps;


    const fragment =
        templateCardTemplate
            .content
            .cloneNode(
                true
            ) as DocumentFragment;


    const card =
        fragment.firstElementChild;


    if (
        !(
            card instanceof
            HTMLElement
        )
    ) {

        throw new Error(
            "テンプレートカードを生成できませんでした。"
        );
    }


    const name =
        requireChild<HTMLElement>(
            card,
            ".template-card__name"
        );


    const meta =
        requireChild<HTMLElement>(
            card,
            ".template-card__meta"
        );


    const exportButton =
        requireChild<HTMLButtonElement>(
            card,
            ".template-card__export-button"
        );


    const editButton =
        requireChild<HTMLButtonElement>(
            card,
            ".template-card__edit-button"
        );


    const deleteButton =
        requireChild<HTMLButtonElement>(
            card,
            ".template-card__delete-button"
        );


    name.textContent =
        template.name;


    meta.textContent =
        [
            `ID: ${template.id}`,

            `入力項目: ${getReferencedFields(
                template
            ).length
            }件`
        ].join(
            " / "
        );


    exportButton.addEventListener(
        "click",
        () => {

            downloadTemplateJson(
                template
            );


            showToast(
                "テンプレートJSONを出力しました。"
            );
        }
    );


    editButton.addEventListener(
        "click",
        () => {

            templateBuilder.openEdit(
                template
            );
        }
    );


    deleteButton.addEventListener(
        "click",
        () => {

            setPendingDeleteTemplateId(template.id);


            if (
                !templateDeleteDialog.open
            ) {

                templateDeleteDialog.showModal();
            }
        }
    );


    return card;
}
