'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

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
        <Link href="/" className="text-sm font-bold tracking-widest uppercase text-foreground">
          Acme
        </Link>

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

        <button
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

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
