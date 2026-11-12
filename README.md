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

## 個人情報保護

`.gitignore` とコミット前フックでファイル種別を検査し、ソース中の典型的な認証情報も検出します。
検査は万能ではなく、個人情報や未知の秘密情報はpush前に人が確認してください。
ソースコードのZIP配布には `scripts/export-public-source.sh` を使用します。
