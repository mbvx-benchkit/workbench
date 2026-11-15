/**
 * PRESET MANAGER list view.
 * All existing DOM classes, callbacks, and object-URL lifecycle are preserved.
 * Only the manager controller owns mutable app state and database operations.
 */
import { getPresetOrientationLabel, type PresetDocument } from "./preset.js";

export interface PresetManagerListDependencies {
    managerList: HTMLElement;
    rememberPreviewUrl: (url: string) => void;
    revokeManagerPreviewObjectUrls: () => void;
    openEditEditor: (document: PresetDocument) => void;
    handleDelete: (document: PresetDocument) => Promise<void>;
    createActionButton: (label: string) => HTMLButtonElement;
    formatBytes: (bytes: number) => string;
}

export function createPresetManagerListView(deps: PresetManagerListDependencies) {
    const { managerList, revokeManagerPreviewObjectUrls, openEditEditor, handleDelete,
        createActionButton, formatBytes } = deps;
    // A narrow write-only adapter; the controller retains URL cleanup ownership.
    const managerPreviewObjectUrls = { push: (url: string): void => deps.rememberPreviewUrl(url) };

function renderManagerEmpty():
        void {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "preset-manager-empty";


        empty.textContent =
            "定型印刷物はまだ登録されていません。";


        managerList.appendChild(
            empty
        );
    }

function renderManagerListError():
        void {

        revokeManagerPreviewObjectUrls();


        managerList.replaceChildren();


        const error =
            document.createElement(
                "div"
            );


        error.className =
            "preset-manager-empty";


        error.textContent =
            "保存データを読み込めませんでした。";


        managerList.appendChild(
            error
        );
    }

function createManagerItem(
        presetDocument: PresetDocument
    ): HTMLElement {

        const item =
            document.createElement(
                "article"
            );


        item.className =
            "preset-manager-item";


        item.appendChild(
            createManagerPreview(
                presetDocument
            )
        );


        item.appendChild(
            createManagerBody(
                presetDocument
            )
        );


        item.appendChild(
            createManagerActions(
                presetDocument
            )
        );


        return item;
    }

function createManagerPreview(
        presetDocument: PresetDocument
    ): HTMLElement {

        const preview =
            document.createElement(
                "div"
            );


        preview.className =
            "preset-manager-item__preview";


        if (
            presetDocument.previewBlob
        ) {

            const objectUrl =
                URL.createObjectURL(
                    presetDocument.previewBlob
                );


            managerPreviewObjectUrls.push(
                objectUrl
            );


            const image =
                document.createElement(
                    "img"
                );


            image.src =
                objectUrl;


            image.alt =
                `${presetDocument.title}のプレビュー`;


            preview.appendChild(
                image
            );


            return preview;
        }


        preview.innerHTML = `
            <svg
                viewBox="0 -960 960 960"
                aria-hidden="true"
            >
                <path
                    d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80Zm-80 280q-33 0-56.5-23.5T160-200v-560q0-33 23.5-56.5T240-840h320l240 240v400q0 33-23.5 56.5T720-120H240Zm280-440h160L520-720v160Z"
                />
            </svg>
        `;


        return preview;
    }

function createManagerBody(
        presetDocument: PresetDocument
    ): HTMLElement {

        const body =
            document.createElement(
                "div"
            );


        body.className =
            "preset-manager-item__body";


        const titleRow =
            document.createElement(
                "div"
            );


        titleRow.className =
            "preset-manager-item__title-row";


        const title =
            document.createElement(
                "h3"
            );


        title.className =
            "preset-manager-item__title";


        title.textContent =
            presetDocument.title;


        const orientation =
            document.createElement(
                "span"
            );


        orientation.className =
            "preset-manager-item__orientation";


        orientation.textContent =
            getPresetOrientationLabel(
                presetDocument.orientation
            );


        titleRow.append(
            title,
            orientation
        );


        const file =
            document.createElement(
                "p"
            );


        file.className =
            "preset-manager-item__file";


        file.textContent =
            [
                presetDocument.pdfFileName,
                formatBytes(
                    presetDocument.pdfBlob.size
                )
            ].join(" · ");


        body.append(
            titleRow,
            file
        );


        return body;
    }

function createManagerActions(
        presetDocument: PresetDocument
    ): HTMLElement {

        const actions =
            document.createElement(
                "div"
            );


        actions.className =
            "preset-manager-item__actions";


        /* -------------------------------------------------
           編集
           ------------------------------------------------- */

        const editButton =
            createActionButton(
                "編集"
            );


        editButton.addEventListener(
            "click",
            () => {

                openEditEditor(
                    presetDocument
                );
            }
        );


        /* -------------------------------------------------
           削除
           ------------------------------------------------- */

        const deleteButton =
            createActionButton(
                "削除"
            );


        deleteButton.addEventListener(
            "click",
            () => {

                void handleDelete(
                    presetDocument
                );
            }
        );


        actions.append(
            editButton,
            deleteButton
        );


        return actions;
    }

    return { renderManagerEmpty, renderManagerListError, createManagerItem, createManagerPreview, createManagerBody, createManagerActions };
}

/**
 * WORKBENCH: preset list view action button.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* Buttons used in the preset manager list. */
export function createPresetActionButton(label: string): HTMLButtonElement {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "glass-button";


        button.textContent =
            label;


        return button;
    }
