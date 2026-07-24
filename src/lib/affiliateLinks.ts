/**
 * ブログ記事内 `<AffiliateLink provider="..." landing="..." />` の対応表。
 * provider・landingを追加する場合はここに1エントリ追加するだけでよい。
 */
export interface AffiliateLinkEntry {
  url: string;
  text: string;
}

export const AFFILIATE_LINKS: Record<string, Record<string, AffiliateLinkEntry>> = {
  matsui: {
    nisa: {
      url: 'https://px.a8.net/svt/ejp?a8mat=4B8791+7118VM+3XCC+69HAA',
      text: 'NISA口座開設先の一例として、松井証券の情報はこちら',
    },
    general: {
      url: 'https://px.a8.net/svt/ejp?a8mat=4B8791+7118VM+3XCC+64C3M',
      text: '証券口座開設先の一例として、松井証券の情報はこちら',
    },
    usstock: {
      url: 'https://px.a8.net/svt/ejp?a8mat=4B8791+7118VM+3XCC+6LP3M',
      text: '米国株投資の一例として、松井証券の情報はこちら',
    },
  },
};

export function getAffiliateLink(provider: string, landing: string): AffiliateLinkEntry | undefined {
  return AFFILIATE_LINKS[provider]?.[landing];
}
