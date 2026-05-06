import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  component: Gate,
  head: () => ({
    meta: [
      { title: "After Dark — Sign in" },
      { name: "description", content: "Private, verified, 18+ only. Sign in or create an account to enter." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Gate() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) nav({ to: "/discover" });
  }, [user, loading, nav]);

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/15 blur-[140px]" />
      </div>

      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8"><Logo /></div>

        <div className="glass rounded-3xl p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-6">
            18+ Only · Private
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
            Welcome to <span className="text-gradient-red">After Dark</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A discreet, verified, real-time platform for adults. Members only — no public profiles, no public posts.
          </p>

          <div className="mt-8 space-y-3">
            <Link
              to="/signup"
              className="block w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground glow-red hover:opacity-90 transition"
            >
              Create account · 2-day free trial
            </Link>
            <Link
              to="/login"
              className="block w-full rounded-xl border border-border px-6 py-3.5 text-sm font-semibold hover:bg-card transition"
            >
              I have an account
            </Link>
          </div>

          <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
            By continuing you confirm you are 18 or older and agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} After Dark · Be kind. Be safe.
        </p>
      </div>
    </div>
  );
}
