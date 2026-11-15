/** Document field validation and recipient-name resolution. No global mutable state. */
import { getReferencedFields } from "../template.js";
export function validateDocumentRequiredFields(activeTemplate, activeValues, showToast) {
    if (!activeTemplate) {
        return false;
    }
    const missingField = getReferencedFields(activeTemplate).find((field) => {
        if (!field.required) {
            return false;
        }
        const value = activeValues[field.id] ??
            "";
        return (value.trim().length ===
            0);
    });
    if (!missingField) {
        return true;
    }
    showToast(`必須項目「${missingField.label}」を入力してください。`);
    const control = document.getElementById(`document-field-${missingField.id}`);
    if (control instanceof
        HTMLInputElement ||
        control instanceof
            HTMLTextAreaElement) {
        control.focus();
        control.reportValidity();
    }
    return false;
}
export function resolveDocumentRecipientName(activeTemplate, activeValues) {
    if (!activeTemplate) {
        return "";
    }
    const fields = getReferencedFields(activeTemplate);
    const exactLabelCandidates = [
        "相手の名前",
        "宛名",
        "宛先名",
        "相手名"
    ];
    const exactField = fields.find((field) => exactLabelCandidates.includes(field.label.trim()));
    if (exactField) {
        return (activeValues[exactField.id] ??
            "");
    }
    const semanticField = fields.find((field) => {
        const label = field.label.trim();
        return (label.includes("宛名") ||
            label.includes("宛先") ||
            (label.includes("相手") &&
                (label.includes("名前") ||
                    label.includes("氏名"))));
    });
    if (semanticField) {
        return (activeValues[semanticField.id] ??
            "");
    }
    const genericNameFields = fields.filter((field) => {
        const label = field.label.trim();
        return (label ===
            "名前" ||
            label ===
                "お名前" ||
            label ===
                "氏名");
    });
    if (genericNameFields.length ===
        1) {
        const field = genericNameFields[0];
        return (activeValues[field.id] ??
            "");
    }
    return "";
}
//# sourceMappingURL=document-field-rules.js.map