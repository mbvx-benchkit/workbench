/** Individual template card rendering and its DOM callbacks. */
import { getReferencedFields } from "../template.js";
import { downloadTemplateJson } from "../template-import.js";
export function createTemplateCardView(template, deps) {
    const { templateCardTemplate, templateDeleteDialog, templateBuilder, showToast, setPendingDeleteTemplateId, requireChild } = deps;
    const fragment = templateCardTemplate
        .content
        .cloneNode(true);
    const card = fragment.firstElementChild;
    if (!(card instanceof
        HTMLElement)) {
        throw new Error("テンプレートカードを生成できませんでした。");
    }
    const name = requireChild(card, ".template-card__name");
    const meta = requireChild(card, ".template-card__meta");
    const exportButton = requireChild(card, ".template-card__export-button");
    const editButton = requireChild(card, ".template-card__edit-button");
    const deleteButton = requireChild(card, ".template-card__delete-button");
    name.textContent =
        template.name;
    meta.textContent =
        [
            `ID: ${template.id}`,
            `入力項目: ${getReferencedFields(template).length}件`
        ].join(" / ");
    exportButton.addEventListener("click", () => {
        downloadTemplateJson(template);
        showToast("テンプレートJSONを出力しました。");
    });
    editButton.addEventListener("click", () => {
        templateBuilder.openEdit(template);
    });
    deleteButton.addEventListener("click", () => {
        setPendingDeleteTemplateId(template.id);
        if (!templateDeleteDialog.open) {
            templateDeleteDialog.showModal();
        }
    });
    return card;
}
//# sourceMappingURL=template-card-view.js.map