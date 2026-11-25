/** Read-only shared release history. No network, storage or tool-specific state. */
interface ReleaseEntry {
    version: string;
    date?: string;
    period?: string;
    title: string;
    summary: string;
    sections: { label: string; items: string[] }[];
    statistics: { label: string; files: number; additions: number; deletions: number }[];
    links: { label: string; href: string }[];
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function section(label: string, items: string[]): HTMLElement {
    const group = element('section');
    const list = element('ul');
    for (const item of items) list.append(element('li', item));
    group.append(element('h4', label), list);
    return group;
}

function releaseCard(release: ReleaseEntry, current: string): HTMLElement {
    const card = element('article', undefined, 'release-history__entry');
    const heading = element('h3', 'v' + release.version);
    if (release.version === current) heading.append(element('span', '最新版', 'release-history__badge'));
    card.append(heading);
    if (release.date) {
        const date = element('time', release.date + ' JST', 'release-history__meta');
        date.dateTime = release.date;
        card.append(date);
    }
    if (release.period) card.append(element('p', '開発・更新時期：' + release.period, 'release-history__meta'));
    card.append(element('p', release.title, 'release-history__title'), element('p', release.summary));
    for (const group of release.sections) card.append(section(group.label, group.items));
    if (release.statistics.length) {
        card.append(section('変更統計（生成物を含むGit差分）', release.statistics.map(s =>
            `${s.label}：${s.files.toLocaleString('ja-JP')}ファイル、+${s.additions.toLocaleString('ja-JP')} / −${s.deletions.toLocaleString('ja-JP')} 行`)));
    }
    if (release.links.length) {
        const group = element('section');
        const list = element('ul', undefined, 'release-history__links');
        for (const item of release.links) {
            // Only links to this project's reviewed public commits, PRs and comparisons.
            if (!/^https:\/\/github\.com\/mbvx-benchkit\/workbench\/(?:commit\/[a-f0-9]{40}|pull\/[1-9]\d*|compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40})$/.test(item.href)) continue;
            const link = element('a', item.label);
            link.href = item.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            const li = element('li');
            li.append(link);
            list.append(li);
        }
        if (list.childElementCount) {
            group.append(element('h4', '関連する変更'), list);
            card.append(group);
        }
    }
    return card;
}

export function installReleaseHistory(slot: Element, version: string, suffix: string, releases: ReleaseEntry[]): void {
    // The caller already provided plain-text metadata; leave it intact on unsupported browsers.
    if (typeof HTMLDialogElement === 'undefined' || typeof HTMLDialogElement.prototype.showModal !== 'function') return;
    try {
        const trigger = element('button', 'WORKBENCH v' + version, 'footer__release-button');
        trigger.type = 'button';
        trigger.setAttribute('aria-label', 'WORKBENCH v' + version + ' のアップデート履歴');
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.addEventListener('click', () => {
            let dialog: HTMLDialogElement | undefined;
            try {
                dialog = element('dialog', undefined, 'release-history');
                dialog.setAttribute('aria-labelledby', 'release-history-title');
                const header = element('header', undefined, 'release-history__header');
                const heading = element('div', undefined, 'release-history__heading');
                const title = element('h2', 'アップデート履歴');
                title.id = 'release-history-title';
                heading.append(element('p', 'RELEASE NOTES', 'release-history__eyebrow'), title);
                const close = element('button', undefined, 'release-history__close');
                close.type = 'button';
                close.setAttribute('aria-label', '閉じる');
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 -960 960 960');
                svg.setAttribute('aria-hidden', 'true');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z');
                svg.append(path);
                close.append(svg);
                const currentDialog = dialog;
                close.addEventListener('click', () => currentDialog.close());
                header.append(heading, close);
                const content = element('div', undefined, 'release-history__content');
                content.append(element('p', '過去のリリース日は公開・リリースコミットの日付（日本時間）です。後続更新は同じバージョンにまとめています。', 'release-history__meta'));
                for (const release of releases) content.append(releaseCard(release, version));
                dialog.append(header, content);
                dialog.addEventListener('close', () => { currentDialog.remove(); trigger.focus(); }, {once:true});
                document.body.append(dialog);
                dialog.showModal();
                close.focus();
            } catch {
                // A display failure must not interrupt or lock the underlying tool.
                if (dialog?.open) dialog.close();
                dialog?.remove();
                trigger.title = '履歴を表示できませんでした。再度お試しください。';
            }
        });
        slot.replaceChildren(trigger, document.createTextNode(suffix));
    } catch {
        // Keep the original footer text if initialization fails.
    }
}
