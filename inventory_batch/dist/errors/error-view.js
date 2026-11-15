export function renderInventoryErrorList(errorList, errorSection, errors) {
    errorList.replaceChildren();
    if (errors.length ===
        0) {
        errorSection.hidden =
            true;
        return;
    }
    const fragment = document.createDocumentFragment();
    for (const error of errors) {
        const listItem = document.createElement("li");
        listItem.textContent =
            error.message;
        fragment.appendChild(listItem);
    }
    errorList.appendChild(fragment);
    errorSection.hidden =
        false;
}
export function clearInventoryErrorList(errorList, errorSection) {
    errorList.replaceChildren();
    errorSection.hidden =
        true;
}
//# sourceMappingURL=error-view.js.map