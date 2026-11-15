/** Template management list layout. CRUD remains in the controller. */
import type { DocumentTemplate } from "../template.js";
export function renderTemplateManagerListView(
    templates: DocumentTemplate[], templateList: HTMLElement, templateListEmpty: HTMLElement,
    createTemplateCard: (template: DocumentTemplate) => HTMLElement
): void {

    templateList.replaceChildren();


    const isEmpty =
        templates.length ===
        0;


    templateListEmpty.hidden =
        !isEmpty;


    templateList.hidden =
        isEmpty;


    if (
        isEmpty
    ) {

        return;
    }


    for (
        const template
        of templates
    ) {

        templateList.appendChild(
            createTemplateCard(
                template
            )
        );
    }
}
