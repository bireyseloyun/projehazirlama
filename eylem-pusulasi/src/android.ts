export const isAndroidApp = import.meta.env.VITE_ANDROID_APP === 'true';

declare global {
  interface Window {
    EylemNative?: { postMessage(message: string): void };
  }
}

/** The Android bridge is injected only for our packaged, local origin. */
export function sendAndroidMessage(action: 'export' | 'minimize', data?: string, filename?: string) {
  if (!isAndroidApp || !window.EylemNative) {
    throw new Error('Android bileşeni hazır değil. Android System WebView uygulamasını güncelleyin.');
  }
  window.EylemNative.postMessage(JSON.stringify({ action, data, filename }));
}
