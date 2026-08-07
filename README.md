# ミッションビンゴ

家族や友人と25個のミッションへ挑戦し、写真・承認・コメントを思い出として残すスマホ向けWebアプリです。

## 公開

`main` ブランチへの更新をGitHub Actionsがビルドし、GitHub Pagesへ公開します。

## Firebase

- Firebase Authentication（匿名）
- Cloud Firestore（ゲーム、申請、写真、承認、コメント）
- 写真は無料試作向けに720px・520KB以下へ圧縮

Firestoreルールは `firebase/firestore.rules` にあります。
