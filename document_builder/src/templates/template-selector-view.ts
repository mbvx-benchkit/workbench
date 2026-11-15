/** Template select DOM rendering, independent from template state mutations. */
import type { DocumentTemplate } from "../template.js";
export function renderTemplateSelectView(
    templates: DocumentTemplate[], activeTemplate: DocumentTemplate | null,
    templateSelect: HTMLSelectElement
): void {

    const selectedId =
        activeTemplate?.id ??
        templateSelect.value;


    templateSelect.replaceChildren();


    const placeholder =
        document.createElement(
            "option"
        );


    placeholder.value =
        "";


    placeholder.textContent =
        templates.length ===
            0
            ? "テンプレートがありません"
            : "テンプレートを選択";


    templateSelect.appendChild(
        placeholder
    );


    for (
        const template
        of templates
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            template.id;


        option.textContent =
            template.name;


        templateSelect.appendChild(
            option
        );
    }


    templateSelect.disabled =
        templates.length ===
        0;


    if (
        selectedId &&
        templates.some(
            (
                template
            ) =>
                template.id ===
                selectedId
        )
    ) {

        templateSelect.value =
            selectedId;

    } else {

        templateSelect.value =
            "";
    }
}
