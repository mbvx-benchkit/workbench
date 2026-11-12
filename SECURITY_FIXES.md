> **追記（2026-11-12）:** **この文書は旧パッチの履歴であり、現在の適用手順ではありません。** 現在の仕様では、復元前の元データを永続保存する復旧ジャーナルと、ZIP生成時の容量検査、履歴DB v3、ソース内秘密情報スキャンが追加されています。GOSPLAN13の自動保存は全体バックアップの対象外です。詳しくは`README.md`と`SECURITY_GUIDE.md`を参照してください。

# WORKBENCH 修正パッチ（2026-11-12）

**基準:** ユーザー提供の `jan(6).zip`。これはプロジェクト全体ではなく、`jan/` に上書き統合する**差分パッチ**です。

## 修正内容・目的

| 監査ID | 修正点 | 目的・効果 | 対象ファイル |
|---|---|---|---|
| H-01 | `/backup/` の除外対象をプロジェクト直下に限定。Git検査も `src/backup/` を正常なソースと判定 | 新しいバックアップ機能のTS/JSが無視・コミット拒否される不具合を解消 | `.gitignore`, `scripts/check-git-sensitive-files.sh` |
| H-02 | インポートしたバックアップのバージョンを保持し、**v1復元時は現在のPDF履歴を維持**。v2は従来どおり履歴を置換 | 旧バックアップ復元で既存PDF履歴が全消去される事故を防止 | `src/backup/backup-types.ts`, `backup-zip.ts`, `backup.ts`, `restore-policy.ts` |
| M-02 | `.md/.txt/.xml/.yml/.yaml/.dat` などのデータ形式をGit除外。コミット前検査は「ソースコード・必須設定だけを許可」の方式へ変更 | 未知の拡張子や業務データの誤登録に対する防御を強化 | `.gitignore`, `scripts/check-git-sensitive-files.sh` |
| M-04 | PDFのヘッダーに加えて `startxref`、`%%EOF`、参照位置とファイルサイズを検査 | `%PDF-???` のような破損ファイルをPDFとして復元しない | `src/backup/backup-zip.ts` |
| M-05 | ZIP展開前に容量と件数を検証し、**展開中も実際のバイト数を監視**。JSZipのバージョンも固定 | サイズ情報を偽装したZIP爆弾を含め、ブラウザのメモリ枯渇リスクを低減 | `src/backup/backup-zip.ts`, `package.json`, `package-lock.json` |
| M-01 | **Gitにコミット済みのソースだけを**専用ZIPで書き出す補助スクリプトを追加 | `.git/`、`node_modules/`、未追跡の業務用JSON、ローカル保存PDFなどを誤ってZIP共有しない | `scripts/export-public-source.sh` |
| H-01関連 | 古いWORKBENCH用pre-commitフックだけを安全に更新するインストーラを追加 | 以前コピーした不具合入りのフックが引き続き動く問題を防止 | `scripts/install-git-hook.sh` |
| 回帰テスト | 正常なv1/v2バックアップ、定型印刷物、履歴保持、破損PDF、圧縮ZIP爆弾のテストを追加 | 改修後も復元互換性が維持されるか検証 | `scripts/test-backup-archive.mjs` |

### ZIPの制限値

- ZIP内エントリー数：最大 **12,000個**
- 1ファイル（展開後）：最大 **64MiB**、画像は最大 **32MiB**、JSONは最大 **20,000,000バイト**
- 合計展開容量：最大 **512MiB**
- 既存UI側のZIP入力サイズ制限（512MiB）もそのまま維持

通常のバックアップを想定した上限です。サイズが上限を超える正当なバックアップも拒否されます。ZIPが宣言する容量に加えて、実際に展開されたバイト数も監視します。JSZipの内部ストリームAPIの互換性を保つため、依存バージョンを `3.10.1` に固定しました。既存のPDFバックアップ形式（v1/v2）は変更していません。

PDF形式の検査は基本的な構造確認であり、すべてのPDF内部オブジェクトの完全性・安全性を保証するものではありません。

## Macへの適用

**過去パッチの手順を記録した箇所です。現行のプロジェクトは `~/Documents/jan/`、ZIPは `~/Downloads/` に置きます。** 現在の改修ではこの旧パッチを再適用しないでください。

旧パッチをダウンロードフォルダから適用していた場合の記録：

```bash
unzip -oq ~/Downloads/workbench_security_fixes_20261112.zip -d ~/Documents/
cd ~/Documents/jan
npm run check
npm run build
node scripts/test-backup-archive.mjs
bash scripts/install-git-hook.sh
bash scripts/check-git-sensitive-files.sh --tracked
```

`npm run build` **必須**。このパッチはTypeScriptソースを変更するため、Macでビルド済み `dist/main.bundle.js` を更新してからGitHub Pagesへ反映してください。macOSの既存 `node_modules` はそのまま利用できます。

`install-git-hook.sh` は、既存フックがWORKBENCH専用なら更新し、他のフックが存在する場合は**上書きせず停止**します。その場合は既存フックに `bash scripts/check-git-sensitive-files.sh --staged` を追加してください。

### コミット前の確認

```bash
bash scripts/check-git-sensitive-files.sh --tracked
git status --short
git diff --check
# 内容を確認後にのみステージング
# git add .
# bash scripts/check-git-sensitive-files.sh --staged
# git diff --cached --name-only
# git commit -m "Fix backup security and legacy history restoration"
# git push
```

`git add .` と `git push` はレビュー後に手動で実施してください。スクリプトは自動でGitHubに公開しません。

**共有するためのソースZIP**（ユーザーデータを含むバックアップではない）：

```bash
bash scripts/export-public-source.sh "$HOME/Documents/WORKBENCH-source.zip"
```

この出力はGitの **最後にコミットされたHEAD** の内容です。未コミットの修正は入りません。`--head` と `--tracked` の検査に合格した場合だけ作成します。ただし、ソースコードそのものに個人情報が直書きされた場合は自動で判別できないので、公開前のレビューは引き続き必要です。

## 旧パッチ時点で「自動修正」していなかった事項

- **H-03: 同一オリジン問題**：GitHub Pagesの公開ホストを分離する必要があります。コード変更やCSPで解決する問題ではありません。
- **M-03: バックアップZIPの暗号化**：この旧パッチ当時は未実装でした。**現行版ではAES-256-GCM暗号化バックアップ（`.wbenc`）を実装済み**です。旧形式ZIPは復元互換用に読み込めます。
- **M-06: GitHubへの未反映**：既存のローカルGit履歴と公開サイトの状態は勝手に変更していません。ビルド後、ユーザー自身が差分を確認・コミットしてください。
- **M-07: 履歴大量件数時の描画性能**：IndexedDBのスキーマ変更・旧レコードの移行が必要になるため、今回のバックアップ安全性修正とは分離しています。
- **L-01: CSPの実機全操作テスト**：HTML上のCSPは保持。実際のブラウザでPDF保存・履歴・印刷・復元を確認してください。
- **L-02: ブラウザのダウンロード完了検出**：一般のブラウザダウンロードでは終了を確実に検出できないため、従来の「ダウンロード開始」を履歴保存の基準にしています。

## 注意：Gitの安全対策がカバーしないもの

`.gitignore` とpre-commitは既に公開済みの履歴・GitHub Actions成果物・別ブランチを削除しません。許可された `.ts/.js/.html/.css` の中に個人情報が直書きされていれば検出できません。`git commit --no-verify` やGitHub Web UI経由の直接編集もローカルフックの保護外です。必要ならGitHub側にもBranch Rulesetsなどの制約を追加してください。
