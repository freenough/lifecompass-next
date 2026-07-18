# 指示書: basePath画像パス欠落バグの修正(compass_logoが404)

作成日: 2026-07-19
対象: `lifecompass-next`
種別: バグ修正

---

## 1. 発生している問題

`https://freenough.com/lifecompass`のヘッダーで、LifeCompassのロゴ画像が表示されない。

DevTools Networkタブで確認したところ:

```
Request URL: https://www.freenough.com/lifecompass/_next/image?url=%2Fimages%2Fcompass_logo.png&w=64&q=75
Status: 404 Not Found (X-Vercel-Error: NOT_FOUND)
```

外側のパス(`/lifecompass/_next/image`)にはbasePathが正しく反映されているが、`url=`パラメータの中身(`%2Fimages%2Fcompass_logo.png` = `/images/compass_logo.png`)に`/lifecompass`が付いていない。basePath設定時、静的ファイルも`/lifecompass/images/...`という場所でのみ配信されるため、prefixなしの場所を探しに行って404になっている。

これは、B-1のOGP画像修正時に発見した「先頭スラッシュのルート相対パスは、Next.jsがbasePathを自動的に補ってくれない」という問題と同じ種類のバグであり、`next/image`コンポーネントの`src`に直接ルート相対パスを書いている箇所すべてに起こりうる。

## 2. 対応内容

### 2-1. 該当箇所の洗い出し(まず調査)

- コードベース全体で、`next/image`(`<Image src="/...">`)の`src`に、`/`から始まるルート相対パスを直接書いている箇所をすべて`grep`等で洗い出す
- 特に`src/components/Header.tsx`の`compass_logo.png`は、今回404が確認された箇所として確実に含まれる
- B-1のA-1調査時点では「Header.tsx・Footer.tsxはnext/image使用のため対応不要」と判断していたが、この判断は誤りだったため、Footer.tsx側も含めて全`next/image`使用箇所を再点検すること

### 2-2. 修正方法

- B-1で作成済みの`withBasePath()`ヘルパー(`src/lib/siteConfig.ts`)を、`next/image`の`src`にも適用する
  - 例:`<Image src="/images/compass_logo.png" .../>` → `<Image src={withBasePath('/images/compass_logo.png')} .../>`
- もし`withBasePath()`が文字列連結のみで、`next/image`の`src`として使うには別の形式が必要な場合は、実装時に適切な形に調整してよい

### 2-3. 確認

- 修正後、ローカルまたはVercelのデプロイ環境で、該当する画像がすべて正しく表示されることを確認する
- 特にHeader.tsxのロゴ、Footer.tsxに画像があればそれも確認
- ブログ記事内のアイキャッチ・図版画像(B-1で`withBasePath`対応済みのはず)についても、今回の`next/image`版の問題が別途混入していないか、念のため確認する

---

## 3. 受け入れ基準

- [ ] `https://freenough.com/lifecompass`のヘッダーロゴが正しく表示される
- [ ] コードベース全体で、`next/image`の`src`にbasePath未対応のルート相対パスが残っていない
- [ ] `npm run build`が型エラーなしで通る
- [ ] 本番(Vercel)環境で実際に画像が表示されることを確認済み

---

## 4. 完了報告フォーマット

```
## 完了報告: basePath画像パス欠落バグの修正

### 変更したファイル
- (ファイルパスと変更概要)

### 洗い出した該当箇所
- (grep結果の一覧)

### 実装内容
- (withBasePath適用方法)

### 確認事項
- npm run build: PASS/FAIL
- 本番環境での画像表示確認: 確認済み/未確認

### 不明点・確認が必要な事項
- (あれば記載)
```
