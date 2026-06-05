'use client';

import { useParallax } from '@/lib/use-parallax';

interface ParallaxHeroProps {
  imageSrc: string;
  imageAlt: string;
}

export function ParallaxHero({
  imageSrc,
  imageAlt,
}: ParallaxHeroProps) {
  // Initialize parallax effect using DOM queries
  useParallax('bg1');

  return (
    <section>
      <div className="fixed-bg" id="bg1">
        <img
          src={imageSrc}
          alt={imageAlt}
          loading="eager"
        />
        <div className="overlay"></div>
      </div>
    </section>
  );
}
