# 🏆 ランキング基盤の選定

## 📝 要約

ランキングの保存先とログインに，Firebase を採用した経緯を記録する．
Supabase，自前の認証，LINE ログインは採らなかった．

## 📋 目次

- 🧭 背景
- ✅ 判断
- 🔀 代替案と棄却理由
- 🔗 参照

## 🧭 背景

GitHub Pages は静的ファイルの配信だけを行う．
ランキングには，外部の保存先とログインの仕組みが要る．
利用者から示された条件は次のとおりである．

- 費用がかからないこと
- ログインは自作せず，既存サービスのログインを使うこと
- 保持は上位 10 件程度でよく，それ以外は消してよいこと
- ゲームを更新してもランキングが消えないこと

## ✅ 判断

- Firebase Authentication と Cloud Firestore を Spark プランで使う
- ログイン手段には Google と GitHub を使う
- ログインには `signInWithPopup()` を使う
- 11 位以下は GitHub Actions の定期実行で削除する
- ランキングは Firestore に置き，GitHub Pages のデプロイと切り離す

## 🔀 代替案と棄却理由

- Supabase: 無料プランは，7 日間の利用が少ないと一時停止する．アクセスが少ない時期にランキングが止まるため採らない
- 自前の構成（Cloudflare Workers と OAuth など）: 認証処理の自作が必要で，条件に反するため採らない
- LINE ログイン: Firebase の標準のログイン手段にない．OpenID Connect 連携には Identity Platform への切り替えが必要なため，初版では採らない
- `signInWithRedirect()`: 採らない．Firebase Hosting 以外で配信すると，サードパーティのストレージを遮断するブラウザで不安定になる

## 🔗 参照

- Firebase の料金プラン: <https://firebase.google.com/docs/projects/billing/firebase-pricing-plans>
- Firebase の OpenID Connect による認証: <https://firebase.google.com/docs/auth/web/openid-connect>
- signInWithRedirect のベストプラクティス: <https://firebase.google.com/docs/auth/web/redirect-best-practices>
- Supabase のプロジェクト一時停止: <https://supabase.com/docs/guides/platform/project-pausing>
- 要求要件書: `docs/requirements.md` の「ランキング」の章
