import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

const schema = z.object({
  nickname: z.string().trim().min(2).max(40),
  email: z.string().trim().email().max(255),
  age: z.coerce.number().int().min(18, "You must be 18 or older").max(120),
  password: z.string().min(8, "At least 8 characters").max(72),
  agree: z.literal("on", { message: "You must agree to the Terms and Privacy Policy" }),
});

function SignupPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/discover`,
        data: { nickname: parsed.data.nickname, age: parsed.data.age },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome to After Dark — your 2-day trial is live");
    nav({ to: "/profile" });
  }

  return (
    <AuthShell title="Join After Dark" subtitle="2 days of full access, free.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nickname" name="nickname" placeholder="What should we call you?" error={errors.nickname} />
        <Field label="Email" name="email" type="email" placeholder="you@example.com" error={errors.email} />
        <Field label="Age" name="age" type="number" min={18} max={120} placeholder="18+" error={errors.age} />
        <Field label="Password" name="password" type="password" placeholder="At least 8 characters" error={errors.password} />
        <button disabled={loading} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition">
          {loading ? "Creating account…" : "Start free trial"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/15 blur-[120px]" />
      </div>
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="glass rounded-3xl p-8">
          <h1 className="font-display text-2xl font-bold text-center">{title}</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <input
        {...props}
        className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
      />
      {error && <span className="mt-1 block text-xs text-primary">{error}</span>}
    </label>
  );
}
