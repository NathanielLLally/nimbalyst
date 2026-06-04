'use client';

import { useParallax } from '@/lib/use-parallax';

interface ParallaxHeroProps {
  imageSrc: string;
  imageAlt: string;
  speedFactor?: number;
}

export function ParallaxHero({
  imageSrc,
  imageAlt,
  speedFactor = 0.5,
}: ParallaxHeroProps) {
  const { elementRef, imgRef } = useParallax(speedFactor);

  return (
    <section ref={elementRef}>
      <div className="fixed-bg" id="bg1">
        <img
          ref={imgRef}
          src={imageSrc}
          alt={imageAlt}
          loading="eager"
        />
        <div className="overlay overlay-dark"></div>
      </div>
    </section>
  );
}
