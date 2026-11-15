export function renderTemplateManagerListView(templates, templateList, templateListEmpty, createTemplateCard) {
    templateList.replaceChildren();
    const isEmpty = templates.length ===
        0;
    templateListEmpty.hidden =
        !isEmpty;
    templateList.hidden =
        isEmpty;
    if (isEmpty) {
        return;
    }
    for (const template of templates) {
        templateList.appendChild(createTemplateCard(template));
    }
}
//# sourceMappingURL=template-list-view.js.map