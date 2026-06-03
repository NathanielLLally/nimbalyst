'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Menu, X,
  Target, Database, TrendingUp, Monitor,
  Mail, FileText, BarChart2,
  HelpCircle, MessageSquare, BookOpen,
  type LucideIcon,
} from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'

const simpleLinks = [
  { label: 'Performance', href: '/performance' },
  { label: 'Lead Gen',    href: '/lead_gen' },
]

type ServiceItem = { title: string; desc: string; href: string; icon: LucideIcon }
type ServiceSection = { category: string; items: ServiceItem[] }

const services: ServiceSection[] = [
  {
    category: 'WEB SOLUTIONS',
    items: [
      { title: 'Lead Generation',  icon: Target,     desc: "We don't chase leads — we attract the right ones and convert them.", href: '/services/lead-generation' },
      { title: 'CRM Integration',  icon: Database,   desc: 'Your CRM, automated',                                               href: '/services/crm-integration' },
      { title: 'SEO Optimization', icon: TrendingUp, desc: 'Rank higher. Spend less.',                                          href: '/services/seo' },
      { title: 'Website Design',   icon: Monitor,    desc: 'Effective presentation makes an impact',                            href: '/services/website-design' },
    ],
  },
  {
    category: 'MARKETING TOOLS',
    items: [
      { title: 'Email Outreach',   icon: Mail,      desc: "Reaching strangers is an art. We've mastered it.", href: '/services/email-outreach' },
      { title: 'Content Strategy', icon: FileText,  desc: 'Effective messaging for growth',                  href: '/services/content-strategy' },
      { title: 'Analytics',        icon: BarChart2, desc: 'Track results and insights',                      href: '/services/analytics' },
    ],
  },
  {
    category: 'SUPPORT',
    items: [
      { title: 'FAQs',      icon: HelpCircle,    desc: 'Answers to common questions',         href: '/faqs' },
      { title: 'Contact',   icon: MessageSquare, desc: 'Reach our expert team',               href: '/contact' },
      { title: 'Resources', icon: BookOpen,      desc: 'Guides for pet care businesses',       href: '/resources' },
      { title: 'Blog',      icon: BookOpen,      desc: 'Think less. Know more. Read the blog.', href: '/blog' },
    ],
  },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/45 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl items-center justify-between px-4 md:px-6">
        <NavigationMenu className="w-full max-w-none justify-between h-[85px]">
          {/* Brand */}
          <Link href="/" className="shrink-0 -m-[10px]">
          {/*            <Image src="/logo.png" alt="Happy Tails Paw Care" width={212} height={53} className="h-[53px] w-auto" />
*/}
            <Image src="/logo.png" alt="Happy Tails Paw Care" width={456} height={158} className="h-[85px] w-auto" />
          </Link>

          {/* Desktop links */}
          <NavigationMenuList className="hidden md:flex">
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-sm text-muted-foreground hover:text-foreground data-[state=open]:text-foreground">
                Services
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid grid-cols-3 gap-6 p-6 w-[700px] top-0 inset-x-0 z-50 border-b border-border/90 bg-background/95 backdrop-blur-xl">
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
                                className="flex gap-3 rounded-md p-2.5 hover:bg-accent transition-colors group"
                              >
                                <item.icon className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                                <div>
                                  <p className="text-sm font-medium text-foreground leading-none mb-1">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {item.desc}
                                  </p>
                                </div>
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

          {/* Mobile toggle */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </NavigationMenu>
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
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/40"
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0 text-primary" />
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
