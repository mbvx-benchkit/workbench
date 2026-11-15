/** PRESET MANAGER event subscriptions. Editor state remains with controller. */
import type { resolvePresetManagerElements } from "./preset-manager-elements.js";
export interface PresetManagerEventHandlers {
 openManager: () => Promise<void>;
 openCreateEditorFromManager: () => void;
 leaveEditor: () => void;
 handleSubmit: (event: SubmitEvent) => Promise<void>;
 revokeManagerPreviewObjectUrls: () => void;
 resetEditor: () => void;
 showListView: () => void;
 resetEditorOrigin: () => void;
}
export function bindPresetManagerEvents(
 elements: ReturnType<typeof resolvePresetManagerElements>,
 handlers: PresetManagerEventHandlers
): void {
 const { settingsButton, dialog, addButton, editorBackButton, editorForm, cancelButton } = elements;
settingsButton.addEventListener(
        "click",
        () => {

            void handlers.openManager();
        }
    );


    /**
     * 管理一覧内の「新規追加」。
     *
     * directではなくmanager起点。
     */
    addButton.addEventListener(
        "click",
        () => {

            handlers.openCreateEditorFromManager();
        }
    );


    /**
     * Editor左上の戻るボタン。
     *
     * manager起点でのみ表示される。
     */
    editorBackButton.addEventListener(
        "click",
        () => {

            handlers.leaveEditor();
        }
    );


    /**
     * キャンセル。
     *
     * direct:
     *   dialogを閉じる
     *
     * manager:
     *   一覧へ戻る
     */
    cancelButton.addEventListener(
        "click",
        () => {

            handlers.leaveEditor();
        }
    );


    /**
     * 保存。
     */
    editorForm.addEventListener(
        "submit",
        (
            event
        ) => {

            void handlers.handleSubmit(
                event
            );
        }
    );


    /**
     * × やEscなどでdialog自体が閉じられた場合。
     */
    dialog.addEventListener(
        "close",
        () => {

            handlers.revokeManagerPreviewObjectUrls();


            handlers.resetEditor();


            handlers.resetEditorOrigin();


            editorBackButton.hidden =
                true;


            handlers.showListView();
        }
    );
}
