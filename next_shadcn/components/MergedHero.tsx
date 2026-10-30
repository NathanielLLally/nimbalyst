'use client';

import { useParallax } from '@/lib/use-parallax';

interface MergedHeroProps {
  imageSrc: string;
  imageAlt: string;
  words?: string[];
  accentedWords?: number[];
  subtext?: string;
}

const STAGGER = 100;
const DURATION = 650;
const LAST_WORD_END = (words: string[]) => (words.length - 1) * STAGGER + DURATION;
const SHOW_BUTTON_AT = (words: string[]) => LAST_WORD_END(words) + 150;

export function MergedHero({
  imageSrc,
  imageAlt,
  words = ['We', 'Fetch', 'the', 'Clients', 'You', 'Handle', 'the', 'Pets'],
  accentedWords = [1, words.length - 1],
  subtext = 'Pet business growth, handled.',
}: MergedHeroProps) {
  useParallax('merged-hero-bg');

  return (
    <section className="relative min-h-screen overflow-hidden dark">
      {/* Parallax background */}
      <div className="absolute inset-0 z-0">
        <div className="fixed-bg" id="merged-hero-bg">
          <img
            src={imageSrc}
            alt={imageAlt}
            loading="eager"
          />
          <div className="overlay"></div>
        </div>
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 z-10 flex min-h-screen w-full flex-col items-center justify-start pt-28 gap-5 overflow-hidden">
        {/* Glow effect */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-80 rounded-full bg-primary/20 blur-3xl" />
        </div>

        {/* Animated words — CSS keyframe animation, no framer-motion dependency */}
        <div className="relative flex flex-wrap justify-center gap-x-[0.4em] gap-y-1">
          {words.map((word, i) => (
            <span
              key={i}
              className={
                accentedWords.includes(i)
                  ? 'bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-4xl tracking-tight text-transparent'
                  : 'text-4xl tracking-tight text-white'
              }
              style={{
                fontFamily: 'var(--font-playfair)',
                animation: `word-blur-in ${DURATION / 1000}s cubic-bezier(0.21, 0.47, 0.32, 0.98) both`,
                animationDelay: `${(i * STAGGER) / 1000}s`,
              }}
            >
              {word}
            </span>
          ))}
        </div>

        {/* Subtext */}
        <p
          className="relative text-base text-zinc-300"
          style={{
            animation: `word-blur-in 0.55s ease-out both`,
            animationDelay: `${(LAST_WORD_END(words) + 200) / 1000}s`,
          }}
        >
          {subtext}
        </p>

        {/* CTA Button */}
        <div className="flex h-10 items-center justify-center">
          <button
            onClick={() => {
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="relative rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-opacity hover:opacity-90"
          >
            Get Started
          </button>
        </div>
      </div>
    </section>
  );
}
