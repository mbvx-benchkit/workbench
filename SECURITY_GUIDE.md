# WORKBENCH Git漏洩対策パッチ（2026-11）

## このパッチに含まれるもの

- `.gitignore`：ユーザーデータ、PDF/ZIP/画像、JSONデータ、秘密情報を原則Gitに入れない。`package*.json` と `tsconfig*.json` は例外。
- `scripts/check-git-sensitive-files.sh`：既に追跡済みのものや、`git add -f` した機密性の高い拡張子を検出して失敗するスクリプト。

**コードの中身に書き込まれた個人情報を自動判別するものではありません。** ファイル名や拡張子が安全でも、push前のレビューは必要です。

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

## pre-commit ガードの有効化（任意・推奨）

Gitが通常の `.git/hooks` を使っており、既存のフックが無ければ次を実行します。

```bash
cd ~/Documents/jan
if [ -e .git/hooks/pre-commit ]; then
  echo '既存のpre-commitフックがあります。置き換えずに内容を確認してください。'
else
  cp scripts/check-git-sensitive-files.sh .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
fi
```

今後、`git commit` の前に自動検査します。Gitのフックは`--no-verify`で回避できるため、絶対的な強制力はありません。GitHub側のpush rulesetでもファイル形式を制限すると多層防御になります。

## 公開用アセットについて

将来、公開するロゴ・画像やJSONデータがアプリに必須になったら、**安全と確認したファイルだけを**`.gitignore`に例外として加え、pre-commitの検査もそのファイルだけ明示的に許可してください。

## push前チェック

```bash
cd ~/Documents/jan
git diff --cached --check
bash scripts/check-git-sensitive-files.sh --tracked
bash scripts/check-git-sensitive-files.sh --staged
git diff --cached --name-only
```

## IndexedDBについて

同じホスト（例 `account.github.io`）上に異なるリポジトリのPagesを置いても、IndexedDBは分離されません。`/jan/` のパスを変えても権限は変わりません。別のオリジンに分離してください。

独自ドメインへの移行前にバックアップZIPを作り、移行先で復元と検証を行ってから、元の`account.github.io`側のサイトデータを削除してください。**新ドメインでは旧オリジンのIndexedDBは直接見えません。**

## 2026-11-12 追加の保護と運用

- `scripts/check-git-sensitive-files.sh` はファイル形式の許可リストに加え、`check-source-secrets.mjs` により追跡対象コード内のGitHubトークン、AWSキー、秘密鍵、資格情報入りURL、長い秘密文字列への直代入を調べます。検出値そのものは出力しません。
- これは高確度パターンの検査であり、個人情報・あらゆるパスワードを完全には検出できません。コードレビューは必要です。
- GOSPLAN13の自動保存とINVENTORY BATCHのCSVは全体バックアップの対象外という既存仕様を保持しています。
- バックアップ復元は複数DBを一括トランザクションにできないため、復元前のコピーを`workbench-restore-recovery`へ保存し、中断時の復旧を提供します。復元完了時にコピーは削除されます。
- 履歴DBはv3になり、PDF一覧と容量集計を分離しています。古い保存済みPDFの内容は変更しません。
