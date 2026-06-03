import GridTextBlur from "@/components/aicanvas/grid-text-blur";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Target, TrendingUp, Monitor, Mail, FileText, BarChart2,
  ArrowRight, Star,
} from "lucide-react";

const stats = [
  { value: "500+", label: "Pet Businesses Served" },
  { value: "3.2×",  label: "Average Lead Increase" },
  { value: "98%",  label: "Client Retention Rate" },
  { value: "4.9★", label: "Average Rating" },
];

const services = [
  { icon: Target,    title: "Lead Generation",  desc: "We attract pet owners who are ready to book — not just browse." },
  { icon: TrendingUp,title: "SEO Optimization",  desc: "Rank higher in local search so clients in your area find you first." },
  { icon: Mail,      title: "Email Outreach",    desc: "Automated campaigns that keep past clients coming back." },
  { icon: Monitor,   title: "Website Design",    desc: "A site that builds trust and turns visitors into bookings." },
  { icon: FileText,  title: "Content Strategy",  desc: "Content that resonates with pet lovers and builds your authority." },
  { icon: BarChart2, title: "Analytics",         desc: "Know exactly what's working and where every client came from." },
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
      {/* Hero — GridLines as interactive background */}
      <section className="relative min-h-screen overflow-hidden dark">
        <div className="relative z-10">
          <GridTextBlur />
        </div>
      </section>

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
      <section className="py-20 bg-card/20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="border-primary/40 text-primary mb-4 px-4 py-1 text-xs tracking-widest uppercase font-mono">
              Services
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Everything you need to grow
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <Card key={svc.title} className="bg-card/60 backdrop-blur border-border/60 hover:border-primary/40 transition-colors group">
                <CardHeader className="pb-2">
                  <div className="text-primary mb-3 group-hover:scale-110 transition-transform w-fit">
                    <svc.icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base">{svc.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{svc.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="border-primary/40 text-primary mb-4 px-4 py-1 text-xs tracking-widest uppercase font-mono">
              Process
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              How it works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step) => (
              <div key={step.num} className="flex flex-col gap-4">
                <div className="text-5xl font-extrabold text-primary/20 leading-none">{step.num}</div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card/20">
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

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1),transparent_70%)] pointer-events-none" />
        <div className="mx-auto max-w-3xl px-4 md:px-6 text-center relative">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Ready to fill{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-purple-300">
              your schedule?
            </span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Join hundreds of pet businesses that have turned their marketing from a cost into their biggest revenue driver.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="gap-2">
              Get started today <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline">
              Book a free audit
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold tracking-widest uppercase text-foreground">Happy Tails Paw Care</p>
          <p className="text-xs text-muted-foreground">© 2021 Happy Tails Paw Care. All rights reserved.</p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a key={l} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
