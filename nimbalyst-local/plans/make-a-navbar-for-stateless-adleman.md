---
title: Navbar with six nav items
status: planned
---

## Context

The site (`hello-nimbalyst`) has no navigation header. The user wants a navbar with six links: Services, About, Resources, Blog, Performance, Leads. The site uses Next.js 15 App Router, Tailwind CSS, shadcn/ui, and a dark violet-primary theme.

## Approach

Create a `components/navbar.tsx` Client Component and mount it in `app/layout.tsx` above `{children}`.

**Why a Client Component?** The mobile hamburger toggle requires `useState`. The rest of the layout stays a Server Component.

## Design

- **Fixed top bar**, full-width, ~64px tall
- **Background**: `bg-background/80 backdrop-blur-md border-b border-border/40` — matches the site's dark card aesthetic
- **Brand/logo** on the left (text placeholder: site name or wordmark)
- **Six nav links** on the right: Services · About · Resources · Blog · Performance · Leads
  - Default: `text-muted-foreground hover:text-foreground` transition
  - Active/hover underline accent using `primary` color
- **Mobile (< md)**: hamburger icon (Lucide `Menu` / `X`) toggles a vertical dropdown of the same links
- Font: inherits Syne via body class — no extra config needed

## Files to Create / Modify

| File | Action |
|------|--------|
| `components/navbar.tsx` | **Create** — new Client Component |
| `app/layout.tsx` | **Edit** — import `<Navbar />`, insert above `{children}` inside `<body>` |

## Implementation Details

### `components/navbar.tsx`

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Services',    href: '/services' },
  { label: 'About',       href: '/about' },
  { label: 'Resources',   href: '/resources' },
  { label: 'Blog',        href: '/blog' },
  { label: 'Performance', href: '/performance' },
  { label: 'Leads',       href: '/leads' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        {/* Brand */}
        <Link href="/" className="text-sm font-bold tracking-widest uppercase text-foreground">
          Acme
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-6">
          {links.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-primary transition-all group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <ul className="md:hidden border-t border-border/40 bg-background/95 px-4 py-4 flex flex-col gap-3">
          {links.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}
```

### `app/layout.tsx` edit

Add `import { Navbar } from '@/components/navbar'` and render `<Navbar />` as the first child of `<body>`. Also add `pt-16` to avoid content being hidden under the fixed bar:

```tsx
<body className="font-[family-name:var(--font-syne)] antialiased">
  <Navbar />
  {children}
</body>
```

> `page.tsx`'s `<main>` already has `py-20`, so the only adjustment needed is ensuring the fixed bar doesn't overlap — the existing top padding handles it.

## Verification

1. `cd /home/nathaniel/src/git/nimbalyst/hello-nimbalyst && npm run dev`
2. Open `localhost:3000` — navbar should appear fixed at top with all six links
3. Resize to mobile width — hamburger icon appears, tapping opens/closes dropdown
4. TypeScript: `npm run build` should pass with no type errors
