# ビジネス文書 PDF出力履歴

## 使い方

1. DOCUMENT BUILDER で文書を作成し、右上の「印刷に進む」を開きます。
2. 「PDFを保存」でPDFを生成・保存すると、**同一のPDF Blob**がブラウザのIndexedDBに自動保存されます。履歴の保存に失敗した場合は警告を表示し、印刷は続けられます。
3. 「印刷する」から通常の印刷に進みます。
4. 右上の「履歴」を開くと、新しい順の `YYYY.MM.DD_宛先様` が一覧表示されます。ダウンロードアイコンで保存時のPDFを再取得できます。同日・同名の出力も個別に記録されます。

## 保存場所・バックアップ

- PDF本体は `IndexedDB: workbench-document-print-history / history` に保存します。ブラウザのサイトデータを消すと履歴も消えるため、ホーム画面で定期的にZIPバックアップしてください。
- WORKBENCHバックアップのZIP内部形式は **v2**。バックアップファイル（.wbenc）はZIP全体がAES-256-GCMで暗号化されています。`document_builder/print-history/history.json` に一覧メタ情報、`document_builder/print-history/pdf/` にPDF本体を封入します。
- v2の復元では履歴をバックアップ内の履歴で置換します。復元前の元データは別のIndexedDBに退避し、成功後に消去します。中断時はホーム画面の復旧ボタンから元のデータへ戻せます。
- 従来のv1バックアップも読み込めます。**v1にはPDF履歴が含まれていないため、既存の履歴を保持します。**
- 機能追加より前に端末へ保存したPDFはIndexedDBに存在しないので、自動で遡って履歴に追加することはできません。
- 履歴一覧はPDF本体を読み込まず50件ずつ取得。件数と合計容量は`history-stats`ストアで管理し、旧v1/v2のIndexedDBからv3へ移行時に一度だけ集計します。PDFを保存・削除・復元したときは同一トランザクションで集計も更新します。
- すべてブラウザのローカルストレージ上で動作し、PDFをサーバーに送信しません。

## 開発・ビルド

- `npm ci`
- `npm run check`
- `npm run build`

ビルド済み `dist/main.bundle.js` と `document_builder/dist/main.bundle.js` も同梱しています。Macで開発を再開した場合は通常どおり `npm run build` で再生成できます。
