# WORKBENCH

個人用のHTML / CSS / TypeScript製ツール集。GitHub Pagesでも動作する静的Webアプリです。

## ビルド・テスト

```bash
npm ci
npm run check
npm run build
npm run test:workbench
bash scripts/check-git-sensitive-files.sh --tracked
```

## バックアップと復元

ホーム画面から暗号化バックアップ（`.wbenc`）を作成します。復元では旧ZIP（v1/v2）も読み込めます。
対象はDOCUMENT BUILDERのテンプレートとPDF履歴、RED INDEX、定型印刷物です。
**GOSPLAN13の自動保存とINVENTORY BATCHのCSVは従来から意図的に対象外です。**
それぞれの画面で提供されるJSON/CSV保存機能を利用してください。

復元時には元データをIndexedDBの`workbench-restore-recovery`に一時退避します。
失敗・中断した場合、ホーム画面の「元のデータを復旧」から元に戻せます。
復元が完了した場合は一時データを削除します。複数DBをまとめた単一の
トランザクションはWeb API上不可能なので、復旧ジャーナルを採用しています。

バックアップの上限は展開後512MiB、1ファイル64MiB、画像32MiB、JSON 20,000,000バイト、エントリー12,000件です。
出力時にPDFを一括取得する前に概算を検査し、ZIP生成時にも厳密に検査します。
PDF履歴は出力・復元とも最大5,000件で、5,001件以上のバックアップは作成しません。
この上限を超える場合は作成できません。

## 保存データとバックアップの整合性

定型印刷物のPDFは64MiB以下、プレビュー画像は32MiB以下で登録できます。PDFは実データのヘッダー・終端を、画像はPNG/JPEG/WebPのシグネチャを確認し、保存形式を正規化します。古いレコードのMIME情報が空または不正でも、バックアップ時にはファイル実体から判定して整え、復元可能なアーカイブを生成します。破損ファイルがある場合はバックアップを出力せず、対象名と原因を表示します。既存データは自動で変更しません。

DOCUMENT BUILDERのPDF履歴は5,000件まで保存でき、履歴PDF単体の容量上限は64MiBです。すでに上限を超えて保存された過去のデータは自動削除しないため、バックアップするには履歴を整理してください。

GOSPLAN13のJSON読込とINVENTORY BATCHのCSV読込は、読み込み前の容量チェック（各10MiB）を行います。

## 個人情報保護

`.gitignore` とコミット前フックでファイル種別を検査し、ソース中の典型的な認証情報も検出します。
検査は万能ではなく、個人情報や未知の秘密情報はpush前に人が確認してください。
ソースコードのZIP配布には `scripts/export-public-source.sh` を使用します。

<!-- WORKBENCH_ARCHITECTURE_STAGE5 -->

## プロジェクト構成

WORKBENCHはGitHub Pages上で動作する静的なツール集です。HTML/CSS/TypeScriptを使用し、アプリ本体の処理はブラウザで実行します。

| ディレクトリ | 用途 |
| --- | --- |
| `src/` | ホーム画面、暗号化バックアップ、定型印刷物管理 |
| `gosplan13/src/` | JANコード入力、チェックデジット、ラベル生成、保存と印刷 |
| `inventory_batch/src/` | 棚卸CSV解析、JAN/EAN-13コード描画、一覧と印刷 |
| `red_index/src/` | 割引不可商品リストの編集、プレビューと印刷 |
| `document_builder/src/` | テンプレート編集、文書作成、PDF保存・印刷履歴 |
| `css/` | 共通ヘッダー、ボタン、トグル、フッター等のスタイル |
| `*/dist/`, `dist/` | ビルド済みJS。GitHub Pagesへの公開に必要なのでコミット対象 |
| `scripts/` | ビルド情報生成、回帰テスト、機密ファイル検査 |

### モジュール分割の原則

- `main.ts` などの入口は初期化と各機能の接続を担当し、画面表示・データ処理を可能な範囲で分離します。
- `templates/`, `history/`, `pdf/`, `barcode/`, `csv/` などは機能別の実装です。
- 細かすぎた `__modules__/*/{models,helpers,lookup,...}.ts` は、機能ごとに `*-utils.ts`, `*-support.ts`, `archive-types.ts` 等へ統合しました。ビルド生成物内の同名ファイルも `npm run build` により更新されます。
- 公開関数の名前、保存データの形式、バックアップ互換性はリファクタリング前と同じです。
- ブラウザ内の保存には現行のIndexedDB等を使用しています。変更前にユーザーデータのバックアップを取ってください。

### バージョンとビルド日時

`package.json` の `version` が全画面のフッターに表示されるWORKBENCHのバージョンです。`npm run build` 時に `scripts/generate-build-info.mjs` が `dist/workbench-build-info.js` を生成し、フッターへ日本時間のビルド日時を表示します。

パッチバージョンを上げる場合：

```bash
npm version patch --no-git-tag-version
npm run check
npm run build
npm run test:workbench
```

新しく作られた `dist` 配下のJSも、`git add` とコミットの対象に含めます。

### 開発・検証フロー

```bash
npm ci
npm run check
npm run build
npm run test:workbench
git diff --check
bash scripts/check-git-sensitive-files.sh --staged
```

`npm run test:workbench` にはフッターのビルド情報検証も含まれます。

PDFの印刷レイアウト、ファイル選択、ダイアログの操作、復元後の状態などは、ビルドと単体テストに加えてブラウザでも確認してください。


## 複数タブの保存とバックアップ復元

WORKBENCHは、同じオリジンの複数タブ間で **Web Locks API** の共通ロック
`workbench:data-integrity:v1` を利用します。定型印刷物、DOCUMENT BUILDERの
テンプレート・PDF履歴・選択状態、GOSPLAN13の自動保存、RED INDEXの自動保存は
共有ロックの下で書き込みます。バックアップ作成時のスナップショット読み取りと、
バックアップ復元・復旧・ロールバックは排他ロックを取得します。

復元開始時にはブラウザ保存領域に更新世代を記録します。復元前から開いていた
別タブから保存しようとすると、古い編集内容で復元データを上書きしないよう
保存を拒否して再読み込みを案内します。途中で復元が中断した場合は通常の保存を
停止し、ホーム画面の「元のデータを復旧」から排他ロック付きで復旧できます。
旧バージョンで作られた復旧ジャーナルが残っている場合も通常の保存を拒否します。

Web Locks APIのないブラウザでは、保護されない書き込み・復元を実行せずエラーを
案内します。保存機能を使う場合は対応ブラウザを利用してください。
**このロックへ参加しない旧バージョンのタブは保護できないため、更新直後の
復元作業では古いタブをすべて閉じ、最新バージョンで開き直してください。**

`npm run test:workbench` にはタブ間の書き込み待機、排他復元、復旧記録、
古いタブからの保存拒否、非対応ブラウザでの停止の回帰テストを含みます。
