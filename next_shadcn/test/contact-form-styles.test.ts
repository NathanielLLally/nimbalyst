import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const form = readFileSync(path.join(root, 'components/MultiStepContactForm.tsx'), 'utf8');
const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8');

const fieldClassNames = [...form.matchAll(/<(input|select|textarea)\b([^>]*?)className="([^"]*)"/g)]
  .filter(([, , attrs]) => !attrs.includes('type="checkbox"'))
  .map(([, , , cls]) => cls);

describe('MultiStepContactForm styles', () => {
  it('finds all text fields', () => {
    expect(fieldClassNames.length).toBe(8);
  });

  it('uses #00000066 background on every field', () => {
    for (const cls of fieldClassNames) {
      expect(cls).toContain('bg-[#00000066]');
      expect(cls).not.toContain('bg-black/10');
    }
  });

  it('uses the zinc-500/zinc-400 muted color for placeholders', () => {
    for (const cls of fieldClassNames.filter((c) => c.includes('placeholder:'))) {
      expect(cls).toContain('placeholder:text-zinc-500');
      expect(cls).toContain('dark:placeholder:text-zinc-400');
      expect(cls).not.toContain('placeholder:text-[#f8f6f0]');
    }
  });

  it('should_give_step_headers_neon_text', () => {
    const h3 = form.match(/<h3 className="([^"]*)"/);
    expect(h3?.[1].split(' ')).toContain('neon-text');
  });

  it('should_give_every_field_label_neon_text', () => {
    const labels = [...form.matchAll(/<label className="([^"]*)"/g)].map((m) => m[1].split(' '));
    expect(labels.length === 8 && labels.every((c) => c.includes('neon-text'))).toBe(true);
  });

  it('should_not_use_numbered_neon_variants', () => {
    expect(/neon-text-\d/.test(form + css)).toBe(false);
  });

  it('should_render_step_subtitle_in_white', () => {
    const m = form.match(/<p className="([^"]*)">\s*\{steps\[currentStep\]\.description\}/);
    expect(m?.[1].split(' ')).toEqual(['text-sm', 'text-white']);
  });

  it('should_render_timezone_in_the_former_subtitle_color', () => {
    const m = form.match(/<p className="([^"]*)">\s*Your timezone:/);
    expect(m?.[1].split(' ').slice(0, 4)).toEqual(['text-xs', 'text-zinc-500', 'dark:text-zinc-400', 'mt-2']);
  });

  it('should_center_timezone_without_a_white_drop_shadow', () => {
    const cls = form.match(/<p className="([^"]*)">\s*Your timezone:/)?.[1].split(' ') ?? [];
    expect({ centered: cls.includes('text-center'), whiteShadow: cls.some((c) => c.startsWith('[text-shadow')) })
      .toEqual({ centered: true, whiteShadow: false });
  });

  it('should_place_a_first_page_only_spacer_between_timezone_and_first_field', () => {
    const tz = form.indexOf('Your timezone:');
    const spacer = form.indexOf('{currentStep === 0 && <div aria-hidden="true" className="h-4" />}');
    const firstFields = form.indexOf('{/* Step 1: Personal Info */}');
    expect(tz < spacer && spacer < firstFields).toBe(true);
  });

  it('makes the "Check this box" consent text white', () => {
    const m = form.match(/<label htmlFor="receiveMessages" className="([^"]*)"/);
    expect(m?.[1]).toContain('text-white');
    expect(m?.[1]).not.toContain('text-zinc-600');
  });

  it('should_define_static_cyan_neon_text_without_animation', () => {
    const rule = css.match(/\.neon-text\s*\{([^}]*)\}/)?.[1] ?? '';
    expect({
      color: /color:\s*#fff;/.test(rule),
      cyanShadow: rule.includes('0 0 5px #00d4ff, 0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 40px #00d4ff, 0 0 80px #00d4ff'),
      animated: /animation/.test(rule) || /@keyframes neon-glow/.test(css),
    }).toEqual({ color: true, cyanShadow: true, animated: false });
  });

  it('should_define_neon_icon_with_no_glow_at_all', () => {
    const rule = css.match(/\.neon-icon\s*\{([^}]*)\}/)?.[1] ?? '';
    expect({
      noTextShadow: /text-shadow:\s*none/.test(rule),
      noFilter: !/filter/.test(rule),
    }).toEqual({ noTextShadow: true, noFilter: true });
  });

  it('should_define_neon_icon_glow_modifier_as_a_cyan_drop_shadow_after_neon_icon', () => {
    const base = css.indexOf('.neon-icon {');
    const mod = css.search(/\.neon-icon--glow\s*\{[^}]*filter:\s*drop-shadow\(0 0 \d+px #00d4ff\)/);
    expect({ defined: mod !== -1, afterBase: mod > base, oldShadowGone: !css.includes('neon-icon--shadow') })
      .toEqual({ defined: true, afterBase: true, oldShadowGone: true });
  });
});
