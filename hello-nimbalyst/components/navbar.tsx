'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'

const simpleLinks = [
  { label: 'About',       href: '/about' },
  { label: 'Resources',   href: '/resources' },
  { label: 'Blog',        href: '/blog' },
  { label: 'Performance', href: '/performance' },
  { label: 'Leads',       href: '/leads' },
]

const services = [
  {
    category: 'WEB SOLUTIONS',
    items: [
      { title: 'Lead Generation',  desc: "We don't chase leads — we attract the right ones and convert them.", href: '/services/lead-generation' },
      { title: 'CRM Integration',  desc: 'Your CRM, automated',                                               href: '/services/crm-integration' },
      { title: 'SEO Optimization', desc: 'Rank higher. Spend less.',                                          href: '/services/seo' },
      { title: 'Website Design',   desc: 'Effective presentation makes an impact',                            href: '/services/website-design' },
    ],
  },
  {
    category: 'MARKETING TOOLS',
    items: [
      { title: 'Email Outreach',   desc: "Reaching strangers is an art. We've mastered it.", href: '/services/email-outreach' },
      { title: 'Content Strategy', desc: 'Effective messaging for growth',                  href: '/services/content-strategy' },
      { title: 'Analytics',        desc: 'Track results and insights',                      href: '/services/analytics' },
    ],
  },
  {
    category: 'SUPPORT',
    items: [
      { title: 'FAQs',      desc: 'Answers to common questions',    href: '/faqs' },
      { title: 'Contact',   desc: 'Reach our expert team',          href: '/contact' },
      { title: 'Resources', desc: 'Guides for pet care businesses',  href: '/resources' },
    ],
  },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        {/* Brand */}
        <Link href="/" className="text-sm font-bold tracking-widest uppercase text-foreground shrink-0">
          Acme
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center">
          <NavigationMenu>
            <NavigationMenuList>
              {/* Services dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-sm text-muted-foreground hover:text-foreground data-[state=open]:text-foreground">
                  Services
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid grid-cols-3 gap-6 p-6 w-[700px]">
                    {services.map((section) => (
                      <div key={section.category}>
                        <p className="mb-3 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/70">
                          {section.category}
                        </p>
                        <ul className="flex flex-col gap-1">
                          {section.items.map((item) => (
                            <li key={item.title}>
                              <NavigationMenuLink asChild>
                                <Link
                                  href={item.href}
                                  className="block rounded-md p-2.5 hover:bg-accent transition-colors group"
                                >
                                  <p className="text-sm font-medium text-foreground leading-none mb-1">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {item.desc}
                                  </p>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Simple links */}
              {simpleLinks.map(({ label, href }) => (
                <NavigationMenuItem key={href}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={href}
                      className="inline-flex h-10 items-center px-4 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50"
                    >
                      {label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border/40 bg-background/95 px-4 py-4 flex flex-col gap-2 max-h-[80vh] overflow-y-auto">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/70 px-2 pt-1 pb-0.5">
            Services
          </p>
          {services.map((section) => (
            <div key={section.category} className="mb-2">
              <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/50 px-2 mb-1">
                {section.category}
              </p>
              {section.items.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/40"
                  onClick={() => setOpen(false)}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          ))}
          <div className="border-t border-border/40 pt-2 mt-1 flex flex-col gap-0.5">
            {simpleLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/40"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
