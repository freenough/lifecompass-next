# 調査報告:note→シミュレーター プリセット連携の実現可能性

作成日:2026-08-02
種別:調査専用(コード変更なし)。`investigation_note_preset_link.md`への回答。

---

## 1. URL経由プロファイル読み込み機構

**結論:既にNext.js版に移植・実装済み。**

- `src/lib/storage.ts`に`encodeProfileUrl()`/`decodeProfileUrl()`が存在する。
  `ProfileV3`オブジェクト全体(`params`/`portfolio`/`events`/`ui`を含む)をJSON化→UTF-8バイト列化→
  base64エンコードし、`+/-`,`/→_`,パディング`=`除去でURL-safe化している(旧版のbase64方式と
  概念的に同じ、`+/-`,`/→_`置換はNext.js版オリジナルの改良)。
- 読み込み側:`src/app/app/page.tsx`内の`SearchParamsLoader`コンポーネントが
  `useSearchParams().get('s')`を見て、値があれば`loadProfile(decodeProfileUrl(s))`を実行し、
  読み込み後に`window.history.replaceState`でURLから`?s=...`を消す。
- 生成側:`src/components/simulator/ProfileDrawer.tsx`の「URLで共有」ボタン
  (`handleShare`、49〜55行目)が`${origin}${BASE_PATH}/app?s=${encoded}`をクリップボードにコピーする。
- `loadProfile()`(`src/store/simulatorStore.ts`)はプロファイルの出所を問わず
  (URL共有・保存済み選択・JSONインポートいずれも)同じ経路で`simulate`/`analyze`を再実行して
  ストア全体を差し替える、という設計になっている。

**つまり「note記事にURLを貼るだけでシミュレーターに特定条件を反映させる」導線は、
コード変更ゼロで今日から使える状態。**

---

## 2. オンボーディング「サンプルデータで試す」の実装詳細

- 文字通り「サンプルデータで試す」というラベルのボタンは存在しない。代わりに:
  - 初回訪問時(localStorageに保存済みプロファイルが無い場合)、ストアの初期値として
    `SAMPLE_PROFILE`(`src/lib/profile.ts`、152行目〜)が自動的に読み込まれる。
  - `SAMPLE_PROFILE`は**汎用的な合成サンプル**(`name: 'サンプル'`、35歳・年収500万・支出300万等)
    であり、田中誠を含む4キャラクターの誰とも紐付いていない。
  - `src/components/simulator/SimulatorForm.tsx`(357行目付近)に「サンプル」というリセット
    リンクがあり、`onClick={() => loadProfile(SAMPLE_PROFILE)}`で同じ汎用サンプルに戻せる。
  - `src/components/simulator/SampleDataBanner.tsx`はnote経由の初回訪問者向けに
    「この画面はサンプルデータです」と案内するバー(localStorageフラグで初回のみ表示)。
- **拡張しやすさの所感:** 非常に拡張しやすい構造。`SearchParamsLoader`は既に`s`パラメータを
  見て`decodeProfileUrl()`→`loadProfile()`という2ステップで動いており、`loadProfile()`自体は
  プロファイルの中身を一切区別しない。同じ`useEffect`内に`preset`のような別パラメータの
  分岐を1つ足すだけで、「URLパラメータで指定したキャラクターのプロファイルを読み込む」形に
  拡張できる規模の変更。

---

## 3. 各キャラクターのプロファイルデータの有無

**結論:4キャラクター全員分、コードから読み込み可能な`ProfileV3`形式のJSONが既に存在する
(ただしsrc/配下ではなく調査用ディレクトリに置かれている)。**

- `reference/tanaka/tanakaFIRE_profiles_2026-06-21.json` — ファイル名・格納フォルダは
  「tanaka」だが、実際の中身はlocalStorageの全件エクスポート形式(`{exportedAt, profiles: [...]}`)
  で、**田中(9バリエーション)・山本(1)・中村(3、旧合算口座版)・佐々木(2)が全て1ファイルに
  混在している。** 各エントリは`id`/`name`/`params`/`portfolio`/`events`/`ui`を持つ完全な
  `ProfileV3`形式で、`loadProfile()`にそのまま渡せる。
  - 田中の代表候補:「田中シリーズ_完全FIRE」「田中シリーズ_セミリタイヤ」など、記事で
    参照する文脈に応じて複数存在(どれを「公式プリセット」にするかは選定が必要)。
  - 山本:「山本シリーズ」1本のみ(34歳・独身エンジニア、`reference/simulation_fixtures.md`の
    確定値と整合)。
  - 中村:「中村シリーズ」「中村シリーズ+教育＋住宅」等3バリエーション。**ただしこれらは
    旧・合算口座版であり、CLAUDE.mdの記載通り公開済みブログ/note記事の数値(口座分割版)とは
    58歳以降で乖離する。**
  - 佐々木:「佐々木シリーズ」「佐々木シリーズ_55歳」の2バリエーション。
- `docs/fixes/done/lifecompass_中村夫婦①_split.json` — 中村夫婦の**現行・正しい**プロファイル
  (口座分割版、ブログ11本目で使用した実績あり)。中村を採用する場合はこちらを使うべきで、
  上記reference/tanaka内の旧中村バリエーションは使うべきではない。
- `reference/simulation_fixtures.md`にも4キャラクターの確定パラメータがMarkdown表・JS風の
  コードブロックとして記載されているが、これは**検証用の参考記述であり、実装(TS/JSON)には
  未反映**(コピペしてTSオブジェクト化する手間が発生する)。
- **いずれも`src/`配下には存在しない**ため、現状ランタイムのアプリからは参照不可能。
  プリセット機能化には、上記JSONから代表バリエーションを選定し、`src/`側にデータとして
  持ち込む(またはURLだけ事前生成してnote側に貼る)作業が必要。

---

## 4. LP側キャラクターカードのnote連携状況(現状再確認)

**前回調査時点(近日公開のみ)から状況が更新されている。**

`lifecompass-next/src/app/page.tsx`(77〜108行目、`characters`配列。前回調査時の想定と異なり、
このLP的なキャラクターカードは`freenough-main`側ではなく`lifecompass-next`側の`/asset-simulator`
トップページに実装されている、という前回調査の訂正結果は今回も同じ):

| キャラクター | note連携 |
|---|---|
| 田中さん | ✓ `https://note.com/freenough/m/m2d3fea55a06e` |
| 山本さん | ✓ `https://note.com/freenough/m/m426fdd7bec8c`(**前回調査時は「近日公開」だったが、新規に追加されている**) |
| 中村夫婦 | ✗ href無し、「近日公開」表示 |
| 佐々木さん | ✗ href無し、「近日公開」表示 |

---

## 5. note.com側での実装制約

Web検索で確認した結果、指示書の前提(JS埋め込み不可、通常リンクのみ)は正しい。

- note.com記事本文には生のHTML/JavaScriptを埋め込めない。
- note側が用意する「埋め込み」は、YouTube・X投稿・他のnote記事・Spotify・Vimeoなど
  **note公式が対応した外部サービスのURLをoEmbed的にリッチ表示する機能**に限られる
  (シミュレーターのURLはこの対象外なので、リッチ埋め込みにはならない)。
- それ以外の外部リンクは通常のテキストリンク(`<a>`相当)として扱われる。
- **追加の実務上の注意点(今回の調査で気づいた点):** `?s=`方式は`ProfileV3`全体
  (`portfolio`/`events`/`ui`含む)をbase64化するため、実際のURLは1,000文字を超えることが
  珍しくない。note記事に貼る分には機能上問題ない(単なる`<a href>`なので長さ制限には
  掛からない)が、記事の下書き画面などで目視するには非常に長く扱いにくい。短いプリセット
  コード(例:`?preset=tanaka`)方式であれば、この可読性の問題を避けられる。

Sources:
- [noteの「サイトに貼る」機能＝埋め込みコードの発行｜RuinDig](https://note.com/ruindig/n/n523d7ec4d403)
- [noteを自分のサイトにHTMLで埋め込みする方法｜バンソウ](https://note.com/sales_dx2/n/n6cb05928d274)
- [ボヤキばなし noteではHTMLが使えない件｜安っさん](https://note.com/hyasuda/n/nf682cd34716c)

---

## 実現方式の選択肢

### A案:短縮プリセットコード方式(`?preset=tanaka`)

- `src/`配下に4キャラクター分の代表`ProfileV3`を定義した小さなデータファイルを新規作成
  (田中はどのバリエーションを「公式」とするか選定が必要。中村は`docs/fixes/done/lifecompass_
  中村夫婦①_split.json`を使う)。
- `SearchParamsLoader`(`src/app/app/page.tsx`)に`preset`パラメータの分岐を追加し、
  該当プロファイルを`loadProfile()`で読み込む(既存の`s`パラメータ処理と並行、数十行程度の追加)。
- note記事側には`.../app?preset=tanaka&utm_source=note&...`という短く読みやすいURLを貼れる。
- 工数感:**小〜中**。読み込み機構自体は完成済みで、主な作業はプロファイルデータの選定・
  移植と、分岐の追加のみ。`simulate.ts`/`analyze.ts`には触れない。

### B案:既存の共有URL(`?s=`)をそのまま流用

- コード変更ゼロ。ProfileDrawerの「URLで共有」機能を使い、選定した4キャラクター分の
  プロファイルを一度ブラウザで開いて「URLで共有」→生成された`?s=...`の長いURLをそのまま
  note記事に貼るだけ。
- 工数感:**ほぼゼロ(コンテンツ運用のみ)**。今すぐ始められる。
- デメリット:URLが非常に長く読みにくい(5節参照)。将来「話数ごとに別プリセットを出す」
  ような細かい展開をする場合、管理する長いURLの数が増えて運用が煩雑になる。

### 所感:A案とB案の関係

B案はA案の「即応版」として位置づけられる。B案でまず田中さん・山本さん(既にnote連携済みの
2キャラクター)向けにURLを生成して先行投入し、中村夫婦・佐々木さんのnote連携が公開されて
プリセットの本数が増えるタイミングでA案(短縮コード化)に切り替える、という段階移行も可能。
どちらの案も既存の`applyProfile()`相当のロジック(`loadProfile()`)・オンボーディング機構
(`SampleDataBanner`)とは無理なく共存できる(汎用サンプルの初期表示ロジックとプリセット
読み込みロジックは、URLパラメータの有無で完全に独立して分岐できるため衝突しない)。
