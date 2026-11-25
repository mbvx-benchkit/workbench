# WORKBENCH Git漏洩対策パッチ（2026-11）

## このパッチに含まれるもの

- `.gitignore`：ユーザーデータ、PDF/ZIP/画像、JSONデータ、秘密情報を原則Gitに入れない。`package*.json` と `tsconfig*.json` は例外。
- `scripts/check-git-sensitive-files.sh`：既に追跡済みのものや、`git add -f` した機密性の高い拡張子を検出して失敗するスクリプト。

ファイル形式に加えて、一般的な個人情報パターンと非公開辞書を検査します。未知の個人情報まで完全に検出するものではないため、push前のレビューは必要です。

## 導入

現在のソース配置は `~/Documents/jan/`、ダウンロードしたパッチZIPの配置は `~/Downloads/` です。

WORKBENCHの `jan/` を残したまま、パッチZIPの `jan/` の中身を上書き統合する。

```bash
cd ~/Documents/jan
# 無理にgit設定を触る前に現在の除外状態を確認
git status --short
bash scripts/check-git-sensitive-files.sh --tracked
```

`--tracked` で `BLOCKED` が表示されたファイルは、過去に追跡されたファイルです。実際の内容を確認してください。

追跡から外す必要があるファイルは、対象を確認したうえで次のように実行します（PC上のファイルは削除しません）。

```bash
git rm --cached -- path/to/PRIVATE_FILE.pdf
```

注意：`.gitignore` は**既にコミットした履歴を消しません**。機密データを過去に公開した場合は、履歴やGitHub上のキャッシュについて別途対処が必要です。

## ローカルGitガード

```bash
bash scripts/install-git-hook.sh
```

pre-commitはステージ済みの内容、公開用Gitメール（GitHubのnoreply）、既知の秘密情報、一般的な個人情報パターンを検査します。pre-pushは実際のPush先の公開済み参照との差分に含まれるコミットと、Pushするツリーを検査し、Gitleaksを実行します。削除だけのPushは対象外です。フックは共通監査の呼び出し専用で、ビルドやブラウザを起動しません。既存の外部フックや独自hooksPathは上書きしません。

### 非公開辞書（初回のPush前に設定）

```bash
mkdir -p "$HOME/.config/workbench"
chmod 700 "$HOME/.config/workbench"
touch "$HOME/.config/workbench/private-terms.txt"
chmod 600 "$HOME/.config/workbench/private-terms.txt"
open -e "$HOME/.config/workbench/private-terms.txt"
```

公開禁止の氏名、会社名、取引先名などを1行1語句で記入してください。空行と行頭の # は無視されます。短すぎる一般語は誤検知の原因になるため避けてください。辞書はリポジトリ外に置き、共有しません。辞書未設定でも一般監査は実行されますが、データを送信するPushは停止します。検出値はログに表示しません。パスの識別にはSHA-256の先頭12文字を使います。

## 検証コマンド

```bash
npm run verify
npm run audit:staged
npm run audit:history
```

verifyはビルド（TypeScriptの型検査を含む）、全回帰テスト、作業ツリー監査、依存監査を一度ずつ実行します。履歴監査は明示実行またはCIで実施します。古いコミットの公開用メールが基準外の場合も報告します。履歴を書き換えたり例外を追加したりする前に内容を確認してください。秘密情報・未知の個人情報の完全検出は保証しません。

GitHub Actions用のYAMLは個別パスだけ許可します。CSPの変更や公開資産の追加は監査ポリシーと合わせてレビューしてください。

## IndexedDBについて

同じホスト（例 `account.github.io`）上に異なるリポジトリのPagesを置いても、IndexedDBは分離されません。`/jan/` のパスを変えても権限は変わりません。別のオリジンに分離してください。

独自ドメインへの移行前にバックアップZIPを作り、移行先で復元と検証を行ってから、元の`account.github.io`側のサイトデータを削除してください。**新ドメインでは旧オリジンのIndexedDBは直接見えません。**

## 2026-11-12 追加の保護と運用

- `scripts/check-git-sensitive-files.sh` はファイル形式の許可リストに加え、`check-source-secrets.mjs` により追跡対象コード内のGitHubトークン、AWSキー、秘密鍵、資格情報入りURL、長い秘密文字列への直代入を調べます。検出値そのものは出力しません。
- これは高確度パターンの検査であり、個人情報・あらゆるパスワードを完全には検出できません。コードレビューは必要です。
- GOSPLAN13の自動保存とINVENTORY BATCHのCSVは全体バックアップの対象外という既存仕様を保持しています。
- バックアップ復元は複数DBを一括トランザクションにできないため、復元前のコピーを`workbench-restore-recovery`へ保存し、中断時の復旧を提供します。復元完了時にコピーは削除されます。
- 履歴DBはv3になり、PDF一覧と容量集計を分離しています。古い保存済みPDFの内容は変更しません。
