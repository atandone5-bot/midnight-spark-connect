import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field } from "./signup";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    nav({ to: "/discover" });
  }

  return (
    <AuthShell title="Welcome back" subtitle="Pick up where you left off.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <button disabled={loading} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here? <Link to="/signup" className="text-primary hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
