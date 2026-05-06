import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Shield, MapPin, MessageCircle, Sparkles, Lock, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "After Dark — Private, premium meetups after hours" },
      { name: "description", content: "Real-time, location-based, verified. Connect privately with people nearby tonight." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[400px] w-[600px] rounded-full bg-primary/10 blur-[140px]" />
      </div>

      {/* nav */}
      <header className="relative z-10 mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Join free
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Tonight Mode is live · 12,400+ active now
        </div>
        <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05]">
          Private meetups,
          <br />
          <span className="text-gradient-red">after dark.</span>
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg text-muted-foreground">
          A discreet, premium, location-based platform for verified adults who want to meet — tonight, nearby, on their terms.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/signup"
            className="group relative rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground glow-red hover:scale-[1.02] transition-transform animate-pulse-red"
          >
            Start your 2-day free trial
          </Link>
          <Link to="/login" className="rounded-2xl border border-border px-8 py-4 text-base font-semibold hover:bg-card transition">
            I have an account
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">18+ only · Verified profiles · No public posts</p>
      </section>

      {/* features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Feature icon={<MapPin className="h-5 w-5" />} title="Real-time nearby" desc="See who's online within your radius. Filter by intent, age, and vibe." />
        <Feature icon={<Shield className="h-5 w-5" />} title="Verified & safe" desc="Selfie verification, blocking, reporting, and moderated photos." />
        <Feature icon={<MessageCircle className="h-5 w-5" />} title="WhatsApp-style chat" desc="Real-time messages with read receipts, typing, and media." />
        <Feature icon={<Lock className="h-5 w-5" />} title="Private by default" desc="Anonymous browsing mode. Your face stays yours until you say so." />
        <Feature icon={<Sparkles className="h-5 w-5" />} title="Tonight Mode" desc="Surface only people active right now, looking to meet tonight." />
        <Feature icon={<Zap className="h-5 w-5" />} title="Pay-as-you-go" desc="No subscriptions. Unlock a chat for KES 200, or 24 hours of access." />
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} After Dark · 18+ only · Be kind. Be safe.</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="glass rounded-2xl p-6 hover:border-primary/40 transition group">
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
