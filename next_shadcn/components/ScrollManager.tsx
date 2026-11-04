'use client';

import { useEffect } from 'react';

/**
 * Deterministic scroll position on load. The browser's automatic scroll
 * restoration restores a stale *pixel* offset on reload, but this page shifts
 * as images/fonts/animated sections settle — so that offset ends up on a
 * seemingly random section. We disable auto restoration and set the position
 * ourselves: to the hashed section if the URL has one (deep-link preserved,
 * re-aligned after layout settles), otherwise to the top.
 */
export function ScrollManager() {
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    const hash = window.location.hash.slice(1);
    if (hash) {
      const alignToHash = () => {
        const el = document.getElementById(decodeURIComponent(hash));
        if (el) el.scrollIntoView();
      };
      // Run after first paint, then again once late layout shifts have settled.
      requestAnimationFrame(alignToHash);
      const t = setTimeout(alignToHash, 300);
      return () => clearTimeout(t);
    }

    window.scrollTo(0, 0);
  }, []);

  return null;
}
