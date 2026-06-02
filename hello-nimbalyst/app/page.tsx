import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Code2, Layers, ArrowRight, Github } from "lucide-react";
import TextBlurReveal from "@/components/aicanvas/text-blur-reveal";

const stack = [
  {
    icon: <Layers className="w-5 h-5" />,
    name: "Next.js 15",
    desc: "App Router, RSC, TypeScript",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    name: "Tailwind CSS",
    desc: "Utility-first styling",
  },
  {
    icon: <Code2 className="w-5 h-5" />,
    name: "shadcn/ui",
    desc: "Accessible component primitives",
  },
];

export default function Home() {
  return (
    <>
    <TextBlurReveal />
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-accent/20 blur-[80px] pointer-events-none" />

      {/* Badge */}
      <div
        className="mb-8 opacity-0 animate-fade-up"
        style={{ animationDelay: "0ms", animationFillMode: "forwards" }}
      >
        <Badge variant="outline" className="border-primary/40 text-primary px-4 py-1 text-xs tracking-widest uppercase font-mono">
          Open in Nimbalyst · Next.js Starter
        </Badge>
      </div>

      {/* Heading */}
      <h1
        className="text-6xl md:text-8xl font-extrabold text-center tracking-tight leading-none mb-6 opacity-0 animate-fade-up"
        style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
      >
        Hello,{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-purple-300">
          World.
        </span>
      </h1>

      {/* Sub */}
      <p
        className="text-muted-foreground text-lg md:text-xl text-center max-w-lg mb-12 opacity-0 animate-fade-up"
        style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
      >
        A production-ready starter with Next.js, Tailwind, shadcn/ui, and Vercel — built for{" "}
        <span className="text-foreground font-medium">Nimbalyst</span>.
      </p>

      {/* CTA buttons */}
      <div
        className="flex flex-wrap gap-3 justify-center mb-20 opacity-0 animate-fade-up"
        style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
      >
        <Button size="lg" className="animate-glow-pulse gap-2">
          Get started <ArrowRight className="w-4 h-4" />
        </Button>
        <Button size="lg" variant="outline" className="gap-2">
          <Github className="w-4 h-4" /> View on GitHub
        </Button>
      </div>

      {/* Stack cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl opacity-0 animate-fade-up"
        style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
      >
        {stack.map((item) => (
          <Card
            key={item.name}
            className="bg-card/60 backdrop-blur border-border/60 hover:border-primary/40 transition-colors group"
          >
            <CardHeader className="pb-2">
              <div className="text-primary mb-2 group-hover:scale-110 transition-transform w-fit">
                {item.icon}
              </div>
              <CardTitle className="text-base">{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{item.desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-16 text-xs text-muted-foreground font-mono tracking-wider opacity-60">
        Deploy to Vercel · Open in Nimbalyst · Ship fast
      </p>
    </main>
    </>
  );
}
