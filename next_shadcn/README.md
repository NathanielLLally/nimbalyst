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
# lead-sourcing-pipeline

A lead-generation and prospect-enrichment pipeline for the dog/pet-care market, optimizing for qualified prospects per search rather than raw volume.

## Installation

### Prerequisites

- Perl 5.40+
- `cpanm` (CPAN Minus) for module installation

### mxCheck.pl Dependencies

The SMTP-level email verification script (`scripts/mxCheck.pl`) requires the following CPAN modules:

```bash
cpanm Net::DNS Net::SMTP Parallel::ForkManager Try::Tiny JSON::PP IO::Socket::Socks
```

**What each module does:**
- `Net::DNS` — DNS queries for MX records and reverse DNS (PTR) lookups
- `Net::SMTP` — SMTP protocol handling for email verification
- `Parallel::ForkManager` — Concurrent worker processes for parallel verification
- `Try::Tiny` — Exception handling
- `JSON::PP` — JSON encoding/decoding for result output
- `IO::Socket::Socks` — SOCKS5 proxy support for SMTP connections

**Core Perl modules** (included with Perl, no install needed):
- `Getopt::Long` — Command-line argument parsing
- `Sys::Hostname` — Local hostname detection
- `File::Temp` — Temporary file handling
- `Time::HiRes` — High-resolution timing
- `Net::Cmd` — Low-level network command protocol

### Installation Steps

1. **Install CPAN dependencies:**
   ```bash
   cpanm Net::DNS Net::SMTP Parallel::ForkManager Try::Tiny JSON::PP IO::Socket::Socks
   ```

2. **Verify installation:**
   ```bash
   perl -c scripts/mxCheck.pl
   ```
   (Note: On some systems with conflicting library versions, the syntax check may report unrelated warnings but should succeed if the script's own syntax is valid.)

## Usage

### Email Verification with mxCheck

Verify a single email:
```bash
./scripts/mxCheck.pl --email owner@example.com
```

Verify from a file (one email per line):
```bash
./scripts/mxCheck.pl --file addresses.txt --threads 30
```

**Options:**
- `--email <addr>` — Verify a single email address
- `--file <path>` — Verify addresses from a file
- `--threads <n>` — Number of concurrent workers (default: 30)
- `--rate-limit <n>` — Max checks started per second (default: 0, unthrottled)
- `--socks5-proxy <host:port>` — Route SMTP through SOCKS5 proxy (credentials via env vars `MXCHECK_SOCKS5_USER` and `MXCHECK_SOCKS5_PASS`)
- `--debug` — Trace execution to STDERR

**Example with all options:**
```bash
./scripts/mxCheck.pl --file addresses.txt --threads 20 --rate-limit 5 --debug
```

Output is a JSON array on STDOUT with verification results per address.
