/**
 * WORKBENCH: preset-card rendering helpers and handlers.
 * Consolidated from Stage-1 mechanical helper splits.
 */

/* =========================================================
   Add Card
   ========================================================= */

export function createAddCard(
    onAddRequested: () => void
): HTMLButtonElement {

    const card =
        document.createElement(
            "button"
        );


    card.type =
        "button";


    card.className =
        "preset-card preset-card--add";


    card.setAttribute(
        "aria-label",
        "定型印刷物を新規追加"
    );


    card.innerHTML = `
        <div class="preset-card__add-content">

            <div
                class="preset-card__add-icon"
                aria-hidden="true"
            >
                <svg
                    viewBox="0 -960 960 960"
                >
                    <path
                        d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"
                    />
                </svg>
            </div>

            <p class="preset-card__add-title">
                新規追加
            </p>

            <p class="preset-card__add-description">
                このPCに定型印刷物を追加します。
            </p>

        </div>
    `;


    card.addEventListener(
        "click",
        onAddRequested
    );


    return card;
}

/* =========================================================
   Types
   ========================================================= */

export type PresetGridHandlers = {

    /**
     * 「新規追加」カード押下時。
     */
    onAddRequested: () => void;
};
