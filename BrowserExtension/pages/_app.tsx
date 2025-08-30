import type { AppProps } from 'next/app';
import { useEffect } from 'react';

// Detect if we're in a Chrome extension
const isChromeExtension = () => {
  try {
    return typeof window !== 'undefined' &&
           typeof (window as any).chrome !== 'undefined' &&
           typeof (window as any).chrome.runtime !== 'undefined';
  } catch {
    return false;
  }
};

export default function MyApp({ Component, pageProps }: AppProps) {
  // Set up font handling for Chrome extension environment
  useEffect(() => {
    if (isChromeExtension()) {
      // Apply any Chrome extension specific styles
      document.documentElement.classList.add('chrome-extension');
    }
  }, []);

  return <Component {...pageProps} />;
}
