🐾🐾🐾🐾

# Hello Nimbalyst

A **Hello World** starter built with:

- **Next.js 15** — App Router, React Server Components, TypeScript
- **Tailwind CSS** — utility-first styling with custom theme
- **shadcn/ui** — accessible component primitives (Button, Card, Badge)
- **Vercel** — zero-config deployment

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

```bash
npx vercel
```

Or push to GitHub and import via [vercel.com/new](https://vercel.com/new).

## Open in Nimbalyst

1. Download [Nimbalyst](https://nimbalyst.com/download/)
2. Open this project folder
3. Start a Claude Code session and point it at this repo

---

## Project structure

```
hello-nimbalyst/
├── app/
│   ├── globals.css       # Tailwind + CSS variables (shadcn dark theme)
│   ├── layout.tsx        # Root layout with Google Fonts
│   └── page.tsx          # Hello World page
├── components/
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       └── card.tsx
├── lib/
│   └── utils.ts          # cn() helper
├── components.json       # shadcn config
├── tailwind.config.ts
├── vercel.json
└── README.md
```
