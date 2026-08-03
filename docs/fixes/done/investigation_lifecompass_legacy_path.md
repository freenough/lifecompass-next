# 調査依頼(lifecompass-next):/lifecompassレガシーパスの重複コンテンツ調査

作成日:2026-08-01
対象リポジトリ:**lifecompass-next**
種別:**調査専用(実装は一切行わない)**

---

## 1. 背景

Google Search Consoleの「ページのインデックス登録」レポートを確認したところ、
以下のように、同一記事が2つの異なるURLパスでそれぞれ別々にインデックス
されていることが判明した。

- `https://www.freenough.com/lifecompass/blog/semi-retirement-blank-period`
- `https://www.freenough.com/asset-simulator/blog/semi-retirement-blank-period`

`https://www.freenough.com/lifecompass/methodology`や
`https://www.freenough.com/lifecompass/disclosure`など、他のページでも
同様に`/lifecompass/*`パスがインデックスされていることを確認している。

freenough-main側の過去の調査(`investigation_sitemap_MAIN.md`)で、
以下のrewrites設定が確認されている:

```js
async rewrites() {
  return [
    { source: "/asset-simulator", destination: "https://freenough-lifecompass.vercel.app/asset-simulator" },
    { source: "/asset-simulator/:path*", destination: "https://freenough-lifecompass.vercel.app/asset-simulator/:path*" },
    { source: "/lifecompass", destination: "https://freenough-lifecompass.vercel.app/lifecompass" },
    { source: "/lifecompass/:path*", destination: "https://freenough-lifecompass.vercel.app/lifecompass/:path*" },
  ];
}
```

`/lifecompass`は開発時の旧コードネームであり(本プロジェクトのルールとして
「LifeCompassという文字列はユーザー向けに一切出してはいけない」という
規約がある)、`/lifecompass/:path*`は「旧パス互換のための転送」という
コメント付きでfreenough-main側に残っている。この転送先が本リポジトリ
(`freenough-lifecompass.vercel.app`)であるため、本リポジトリ側で
`/lifecompass/*`が実際にどう処理されているかを確認したい。

**懸念**:単なる旧URLの残骸(実体はなくGoogleのインデックスにだけ残っている
古い情報)であれば実害は小さいが、もし本リポジトリ内に`/lifecompass/*`と
`/asset-simulator/*`の両方に対応する実装が今も生きていて、実際に同じ
コンテンツを2つの正規URLとして返してしまっているなら、重複コンテンツと
してAdSense/Google双方の評価に悪影響を与えている可能性がある。

---

## 2. 調査してほしいこと

### 2-1. `/lifecompass/*`の実装有無の確認

- 本リポジトリのルーティング(App Router)に、`/lifecompass`や
  `/lifecompass/[...]`に対応する実装(ディレクトリ・ページファイル・
  リダイレクト処理)が存在するか確認すること
- 存在する場合、それが独自のページ実装なのか、それとも`redirect()`や
  `middleware.ts`で`/asset-simulator/*`へ転送しているだけなのかを
  明確にすること

### 2-2. 本番での実際の挙動確認

- 実際に本番URL(例:
  `https://www.freenough.com/lifecompass/blog/semi-retirement-blank-period`)
  にアクセスした場合、以下のいずれの挙動になっているかをcurlで確認すること
  (`-I`オプション等でステータスコードとLocationヘッダーを確認)
  - 200で独自コンテンツが返る(=真の重複コンテンツ)
  - 301/302で`/asset-simulator/*`側へリダイレクトされる(=実質問題なし)
  - 200だが中身が`/asset-simulator/*`側と完全に同一(=リダイレクトでは
    なくrewrite/プロキシで同一内容を返している可能性)
  - 404(=リンク切れ。sitemap/内部リンクからは到達しないはずだが、
    Google側に古い記録が残っているだけの可能性)
- 上記を、少なくとも3パス程度(`/lifecompass`、
  `/lifecompass/blog/semi-retirement-blank-period`、
  `/lifecompass/methodology`)で確認すること

### 2-3. canonicalタグの確認

- `/asset-simulator/*`側の各ページに`<link rel="canonical">`タグが
  設定されているか確認すること。設定されている場合、その値が正しく
  `https://www.freenough.com/asset-simulator/...`を指しているか確認する
  こと
- もし`/lifecompass/*`が独自に200を返す実装になっている場合、そちら側にも
  canonicalタグが設定されているか(設定されていれば、それが
  `/asset-simulator/*`側を指しているか)確認すること

---

## 3. 絶対にやってはいけないこと

- **実装・修正は一切行わないこと**。本指示書は調査専用
- 独自に再実装したスクリプトで検証しないこと。既存のコード・本番環境への
  読み取り専用アクセス(curl等)で確認すること

---

## 4. 完了報告のフォーマット

1. `/lifecompass/*`の実装有無(ある場合は該当ファイルパス)
2. 本番での実際の挙動(2-2の3パス分、ステータスコード・Locationヘッダー
   の有無を明記)
3. canonicalタグの設定状況(`/asset-simulator/*`側・`/lifecompass/*`側
   両方)
4. 上記を踏まえた、次の実装フェーズで対応すべき項目の選択肢(例:rewritesを
   301リダイレクトに切り替える、canonicalタグを追加する、等。判断は
   KENZOとこのチャットで行うため、選択肢の提示に留め、独断で優先順位を
   つけないこと)
