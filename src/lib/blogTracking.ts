// ブログ一覧のGA4イベントで使う「場所」の値。
// サイドバー（注目記事・導線カード）はDOMを複製せず、lg以上では右列のsticky、lg未満では記事一覧の後に
// 同じ要素を表示しているため、どちらとして見えていたかはクリック時の画面幅で判定する
// （lgの境界1024pxはTailwindの既定値と一致させる）。
export type BlogPostClickLocation = 'list' | 'sidebar' | 'mobile_bottom';
export type BlogAsideLocation = Exclude<BlogPostClickLocation, 'list'>;

export function getBlogAsideLocation(): BlogAsideLocation {
  return window.matchMedia('(min-width: 1024px)').matches ? 'sidebar' : 'mobile_bottom';
}
