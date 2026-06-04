import { useEffect, useRef } from 'react';

export function useParallax(speed = 0.5) {
  const elementRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    const img = imgRef.current;
    if (!element || !img) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (!element || !img) return;

      const rect = element.getBoundingClientRect();
      const elementTop = rect.top;
      const windowHeight = window.innerHeight;

      // Only apply parallax when element is in view
      if (elementTop < windowHeight && elementTop + element.offsetHeight > 0) {
        // Calculate parallax offset based on scroll position
        const scrollProgress = (windowHeight - elementTop) / (windowHeight + element.offsetHeight);
        const offset = (scrollProgress - 0.5) * 100 * speed;

        // Use transform3d for better mobile performance
        img.style.transform = `translate3d(0, ${offset}px, 0)`;
      }
    };

    // Throttle scroll events for better performance
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

    window.addEventListener('scroll', throttledScroll, { passive: true });
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener('scroll', throttledScroll);
    };
  }, [speed]);

  return { elementRef, imgRef };
}
