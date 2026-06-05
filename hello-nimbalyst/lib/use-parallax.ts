import { useEffect } from 'react';

export function useParallax(elementId: string = 'bg1') {
  useEffect(() => {
    // Use direct DOM query to find the image
    const bg = document.getElementById(elementId);
    const img = bg?.querySelector('img') as HTMLImageElement | null;

    if (!bg || !img) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (!img) return;

      // Get the background element's position
      const rect = bg.getBoundingClientRect();

      // Calculate scroll offset to keep image fixed in viewport
      // When bg is at top of viewport (rect.top = 0), offset = 0
      // As you scroll, adjust the image position to compensate
      const offsetY = -rect.top;

      // Apply fixed background effect - image stays in place
      img.style.transform = `translate3d(0, ${offsetY}px, 0)`;
    };

    // Throttle scroll events using requestAnimationFrame
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Set up the scroll listener
    window.addEventListener('scroll', throttledScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', throttledScroll);
    };
  }, [elementId]);
}
