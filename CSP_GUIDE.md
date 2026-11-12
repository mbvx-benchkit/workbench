# WORKBENCH CSP 導入（2026-11-12）

この変更は、全5画面の `index.html` の `<head>` 冒頭に Content Security Policy（CSP）を追加します。GitHub Pages では通常、独自の HTTP レスポンスヘッダーを設定できないため、HTML の `http-equiv` を使っています。

## 制限内容

- `script-src 'self'`：同じオリジンの外部 JS ファイルのみ実行。インライン JS、`eval`、外部CDNのJSを禁止。
- `script-src-attr 'none'`：`onclick="..."` 等のインラインイベント処理を禁止。
- `connect-src 'none'`：JavaScript からの `fetch`、XHR、WebSocket 等による通信を禁止。現行のアプリはネットワークAPIを利用しません。
- `img-src 'self' data: blob:`：同一オリジンの画像と、ユーザーが指定した画像の `data:` / `blob:` URL を許可。外部画像へのアクセスを制限。
- `style-src 'self' 'unsafe-inline'`：CSSファイルを同一オリジンに限定。DOMスタイル操作とPDF生成で使う `html2canvas` のスタイル複製を維持するため、**インラインCSSだけ許可**。インラインJavaScriptは許可しません。
- `font-src 'self' data:`：ローカルフォントおよび埋め込みフォントのみ。
- `frame-src 'self' blob:`：PDFキャプチャ処理の内部iframeを許可しつつ、外部iframeを制限。
- `object-src 'none'`、`worker-src 'none'`、`media-src 'none'`：使っていない危険な読み込みを禁止。
- `base-uri 'none'`、`form-action 'self'`：ページの基準URL変更と外部へのフォーム送信を禁止。
- `default-src 'none'`：個別に許可していないリソースを拒否。

## 導入

1. 現在の `jan` をバックアップする。
2. このZIPの `jan/` 以下を、現在の `jan/` に**上書き統合**する（フォルダ自体を丸ごと置き換えない）。
3. GitHub Pagesに反映する場合はHTMLの変更をコミット・pushする。
4. ブラウザで強制再読み込みし、文書作成→PDF保存→履歴ダウンロード、JSON/CSVの入出力、定型印刷物プレビュー、画像ラベル表示、印刷を確認する。
5. Chromeの開発者ツールのConsoleで `Refused to ... because it violates the following Content Security Policy directive ...` が出ないか確認する。

`npm run build` は必須ではありません。変更対象はHTMLだけです。

## できないこと

- CSPはGitHubや端末が乗っ取られること自体を防ぎません。許可済みの同一オリジンJavaScriptが改ざんされればIndexedDBを読み取れます。
- CSPは、同一オリジンの別リポジトリ・別ページからのIndexedDBアクセスを隔離できません。別ホスト名への分離が必要です。
- HTMLのmetaタグ版では `frame-ancestors`、`report-uri`、`sandbox` や Report-Only を設定できません。
- `connect-src 'none'` 等は外部送信経路を減らしますが、すべてのデータ流出を保証して遮断するものではありません（例えば一部のページ遷移）。
- 今後、外部API・外部画像等を追加する場合は、必要性を検討してCSPを明示的に調整してください。
