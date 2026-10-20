'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Services } from "@/components/Services";
import { MergedHero } from "@/components/MergedHero";
import { FAQ } from "@/components/FAQ";
import LogoCloudMarquee from "@/components/logo-cloud-marquee";
//import LogoCloudDemo from "@/components/shadcn-space/blocks/logo-cloud-01/logo-cloud"
import ContactWithGlobe from "@/components/contact-with-globe";
import { CardHoverLift } from "@/components/hover-lift";
import GridLines from "@/components/aicanvas/grid-lines";
import {
  ArrowRight, Mail, Megaphone, PhoneCall, PhoneForwarded, CalendarCheck, FileX, RotateCcw, MapPin, Phone, Headphones, CheckCircle, Facebook, Instagram, Linkedin, Twitter,
} from "lucide-react";

const stats = [
  { value: "$0",       label: "Setup Fees" },
  { value: "< 60 sec", label: "Lead Response Time" },
  { value: "Pay Per",  label: "Qualified Lead" },
];


const steps = [
  { num: "01", title: "Audit & Strategy",  desc: "We analyze your current marketing, local competition, and growth opportunities." },
  { num: "02", title: "Build & Launch",    desc: "We build your marketing infrastructure — website, campaigns, and automation." },
  { num: "03", title: "Grow & Optimize",   desc: "We continuously refine based on real data to keep your calendar full." },
];

const leadFlow = [
  { when: "0 sec",         icon: Megaphone,      title: "A pet owner responds to your ad",           desc: "They tap your ad looking for grooming, daycare, training, or vet care." },
  { when: "< 60 sec",      icon: PhoneCall,      title: "We call them",                              desc: "We confirm what they need, where they are, and that they're ready to book." },
  { when: "Minutes later", icon: PhoneForwarded, title: "Live transfer",                             desc: "The qualified pet owner is connected straight to your phone." },
  { when: "You",           icon: CalendarCheck,  title: "Field the call or book the appointment",    desc: "You talk to someone who's ready to book. You only pay for leads that qualify." },
];

const promises = [
  { icon: FileX,     title: "No Contracts",        desc: "Stay because it works, not because you're locked in." },
  { icon: RotateCcw, title: "Bad Leads Credited",  desc: "Wrong number, wrong area, or not a real customer? You don't pay for it." },
  { icon: MapPin,    title: "Exclusive Territory", desc: "Your leads are yours. We never sell them to the business down the street." },
];

export default function Home() {

  return (
    <>
      <MergedHero
        imageSrc="/dogs_conference_room_laptop4.png"
        imageAlt="Dogs in conference room with laptop"
        words={['We', 'Fetch', 'the', 'Clients', 'You', 'Handle', 'the', 'Pets']}
        accentedWords={[1, 7]}
        subtext="Qualified leads, zero hustle."
      />



      {/* Stats bar */}
      <section className="border-y border-border/40 bg-card/30 py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value prop */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="mx-auto max-w-3xl px-4 md:px-6 text-center">
          <Badge variant="outline" className="border-primary/40 text-primary mb-6 px-4 py-1 text-xs tracking-widest uppercase font-mono">
            Why Us
          </Badge>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            You're great at caring for pets.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-purple-300">
              Let us handle the clients.
            </span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Most pet businesses lose thousands of dollars a month to ineffective marketing — or none at all. We've built every tool and strategy specifically for groomers, daycares, vets, and trainers. No generic agency tactics.
          </p>
        </div>
      </section>

      <LogoCloudMarquee />

      {/* Services */}
      <Services />

      {/* How it works */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="border-primary/40 text-primary mb-4 px-4 py-1 text-xs tracking-widest uppercase font-mono">
              Process
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              How it works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <CardHoverLift key={step.num} className="bg-background border border-border/40 rounded-2xl p-8 hover:border-primary/40 transition-colors">
                <div className="flex flex-col gap-6 h-full">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-extrabold text-primary">{step.num}</div>
                    <div className="h-12 w-1 bg-gradient-to-b from-primary to-primary/20 rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-foreground mb-3">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 text-primary pt-4 border-t border-border/20">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Key milestone</span>
                  </div>
                </div>
              </CardHoverLift>
            ))}
          </div>
        </div>
      </section>

      {/* Dog and cats parallax section */}
      <section className="relative h-96 overflow-hidden" style={{ backgroundImage: 'url(/dog_and_cats.png)', backgroundSize: 'cover', backgroundPosition: 'bottom center', backgroundAttachment: 'fixed', opacity: 0.8 }} id="services-bg" />

      {/* Lead walkthrough */}
      <section id="lead-flow" className="py-20 bg-card/20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="border-primary/40 text-primary mb-4 px-4 py-1 text-xs tracking-widest uppercase font-mono">
              How a Lead Reaches You
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              From ad click to your phone in minutes
            </h2>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {leadFlow.map((step) => (
              <li key={step.when} className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-background p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs uppercase tracking-widest text-primary">{step.when}</span>
                  <step.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-extrabold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Promises */}
      <section id="promises" className="py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="border-primary/40 text-primary mb-4 px-4 py-1 text-xs tracking-widest uppercase font-mono">
              Our Promises
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              What you can count on
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {promises.map((p) => (
              <Card key={p.title} className="bg-card/60 backdrop-blur border-border/60">
                <CardContent className="pt-6 flex flex-col gap-4">
                  <p.icon className="w-8 h-8 text-primary" aria-hidden="true" />
                  <h3 className="text-xl font-extrabold text-foreground">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <ContactWithGlobe
        id="contact"
        title="Ready to fill your schedule?"
        subtitle="Get Started"
        description=""
        contactLinks={[
          { icon: Mail, label: 'info@happytailspawcare.com', href: 'mailto:info@happytailspawcare.com' },
          { icon: Phone, label: '(646) 846-8087', href: 'tel:+16468468087' },
          { icon: Headphones, label: 'Speak with an expert', href: 'mailto:info@happytailspawcare.com' },
        ]}
      />

      <FAQ />

      {/* Footer */}
      <footer className="border-t border-border/40 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Logo */}
            <div className="flex flex-col gap-4">
              <Link href="/" className="w-fit">
                <Image
                  src="/happy_tails_logo_blue_round_300x300.png"
                  alt="Happy Tails Paw Care"
                  width={200}
                  height={200}
                  className="h-[200px] w-[200px]"
                />
              </Link>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">Quick Links</h4>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Contact", href: "#contact" },
                  { label: "Services", href: "#services" },
                ].map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">Follow Us</h4>
              <div className="flex gap-4">
                <a href="https://www.facebook.com/profile.php?id=61579363873192" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://instagram.com/happytailspawcare/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/40 pt-8">
            <p className="text-xs text-muted-foreground text-center">© 2024 Happy Tails Paw Care. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
