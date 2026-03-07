'use client';

import { useCallback, useEffect } from 'react';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export function useRecaptcha() {
  const siteKey = process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHE_SITEKEY;

  const executeRecaptcha = useCallback(async (action: string) => {
    if (!siteKey) {
      console.warn('reCAPTCHA site key not found');
      return '';
    }

    return new Promise<string>((resolve) => {
      if (typeof window === 'undefined' || !window.grecaptcha) {
        resolve('');
        return;
      }

      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(siteKey, { action });
          resolve(token);
        } catch (error) {
          console.error('reCAPTCHA execution failed:', error);
          resolve('');
        }
      });
    });
  }, [siteKey]);

  return { executeRecaptcha };
}
