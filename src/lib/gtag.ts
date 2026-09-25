declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export interface TrackEventOptions {
  // ページの再読み込みを伴うリンク（生HTMLの<a>など）のクリックで送るときに指定する。
  // transport_type: 'beacon' を付け、移動によって送信が失われにくくする。
  beacon?: boolean;
}

export function trackEvent(eventName: string, params?: Record<string, unknown>, options?: TrackEventOptions): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    const sendParams = options?.beacon ? { ...params, transport_type: 'beacon' } : params;
    if (sendParams) {
      window.gtag('event', eventName, sendParams);
    } else {
      window.gtag('event', eventName);
    }
  }
}
