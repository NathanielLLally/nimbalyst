'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Services } from "@/components/Services";
import { MergedHero } from "@/components/MergedHero";
import { FAQ } from "@/components/FAQ";
import ContactWithGlobe from "@/components/contact-with-globe";
import { CardHoverLift } from "@/components/hover-lift";
import {
  ArrowRight, Star, Mail, Phone, Headphones, CheckCircle,
} from "lucide-react";

const stats = [
  { value: "500+", label: "Pet Businesses Served" },
  { value: "3.2×",  label: "Average Lead Increase" },
  { value: "98%",  label: "Client Retention Rate" },
  { value: "4.9★", label: "Average Rating" },
];


const steps = [
  { num: "01", title: "Audit & Strategy",  desc: "We analyze your current marketing, local competition, and growth opportunities." },
  { num: "02", title: "Build & Launch",    desc: "We build your marketing infrastructure — website, campaigns, and automation." },
  { num: "03", title: "Grow & Optimize",   desc: "We continuously refine based on real data to keep your calendar full." },
];

const testimonials = [
  {
    quote: "Within 3 months my grooming salon went from 20 to 60+ weekly clients. These guys actually get pet businesses.",
    name: "Sarah M.",
    role: "Owner, Fluffy Cuts Grooming",
  },
  {
    quote: "I was skeptical, but they proved me wrong. My daycare is fully booked 6 weeks out.",
    name: "James T.",
    role: "Founder, Happy Paws Daycare",
  },
  {
    quote: "The SEO work alone paid for itself in the first month. Now I get calls every single day.",
    name: "Linda K.",
    role: "Veterinarian, Paws & Claws Clinic",
  },
];

export default function Home() {
  return (
    <>
      <MergedHero
        imageSrc="/dogs_conference_room_laptop4.png"
        imageAlt="Dogs in conference room with laptop"
        speedFactor={1}
        words={['We', 'Fetch', 'the', 'Clients', 'You', 'Handle', 'the', 'Pets']}
        accentedWords={[1, 7]}
        subtext="Qualified leads, zero hustle."
      />



      {/* Stats bar */}
      <section className="border-y border-border/40 bg-card/30 py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
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

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-card/20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="border-primary/40 text-primary mb-4 px-4 py-1 text-xs tracking-widest uppercase font-mono">
              Testimonials
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Pet businesses that are fully booked
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="bg-card/60 backdrop-blur border-border/60">
                <CardContent className="pt-6 flex flex-col h-full">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">"{t.quote}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
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
      <footer className="border-t border-border/40 py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold tracking-widest uppercase text-foreground">Happy Tails Paw Care</p>
          <p className="text-xs text-muted-foreground">© 2021 Happy Tails Paw Care. All rights reserved.</p>
          <div className="flex gap-6">
            {[
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
              { label: "Contact", href: "#contact" }
            ].map((l) => (
              <a key={l.label} href={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
