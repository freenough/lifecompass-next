declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    if (params) {
      window.gtag('event', eventName, params);
    } else {
      window.gtag('event', eventName);
    }
  }
}
