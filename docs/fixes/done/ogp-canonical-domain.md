# 修正指示: ogp-canonical-domain

## 背景

現在、OGP画像のURLがVercelのプレビューURL(デプロイごとに変わる、または本番と異なるURL)を直接参照している。このままSNS(X、note.com等)でシェアされると、画像が表示されない・古いプレビュー環境の画像が出るなどのリスクがある。

近々独自ドメイン(`lifecompass.freenough.jp`)への移行を予定しているため、今回はハードコードではなく、ドメインを設定値として1箇所にまとめる形で直し、移行時はその設定値を変更するだけで済むようにする。

## 修正方針

1. 現状、OGP画像URL(および必要であれば他のmetadata内の絶対URL)がどこにハードコードされているか特定する(`layout.tsx`や各ページの`generateMetadata`、`metadata`オブジェクト等)
2. Next.jsの`metadataBase`(またはそれに準ずる仕組み)を使い、ドメインを環境変数(例: `NEXT_PUBLIC_SITE_URL`)から取得する形に変更する
3. 現時点では環境変数の値を、現在の本番ドメイン(Vercelの本番URL、独自ドメインが決まっていなければ現状のVercel本番URLで可)に設定する
4. 独自ドメイン移行時は、この環境変数の値を変更するだけで完結する状態にしておく

## 確認事項

- 実際にOGPがどう見えるか、SNSカードのデバッグツール(X Card ValidatorやFacebookのSharing Debugger等、使えるもので可)で画像が正しく表示されることを確認する。使えるツールがない場合は、生成されたHTMLの`<meta property="og:image">`タグのURLが正しい絶対URL(canonical domain)になっていることを確認する
- ブログ記事・note連携ページなど、OGPが設定されている他のページでも同様に正しいURLになっていることを確認する
- 6-A/6-B再検証結果(該当する場合)

## 完了後

このファイルを docs/fixes/done/ へ移動すること。
