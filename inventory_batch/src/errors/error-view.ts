/** Error list DOM rendering. Filtering/merging remains in error-model.ts. */
import type { DisplayError } from "./error-model.js";
export function renderInventoryErrorList(
    errorList: HTMLElement, errorSection: HTMLElement, errors: readonly DisplayError[]
): void {

    errorList.replaceChildren();


    if (
        errors.length ===
        0
    ) {

        errorSection.hidden =
            true;


        return;
    }


    const fragment =
        document.createDocumentFragment();


    for (
        const error
        of errors
    ) {

        const listItem =
            document.createElement(
                "li"
            );


        listItem.textContent =
            error.message;


        fragment.appendChild(
            listItem
        );
    }


    errorList.appendChild(
        fragment
    );


    errorSection.hidden =
        false;
}

export function clearInventoryErrorList(errorList: HTMLElement, errorSection: HTMLElement): void {

    errorList.replaceChildren();


    errorSection.hidden =
        true;
}
