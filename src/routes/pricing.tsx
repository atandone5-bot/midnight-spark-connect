import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { useServerFn } from "@tanstack/react-start";
import { initiateStkPush, PACKAGES, type PackId } from "@/lib/mpesa.functions";
import { toast } from "sonner";
import { Crown, Check, Sparkles, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/pricing")({ component: Pricing });

function Pricing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [wallet, setWallet] = useState<{ chats_balance: number; is_premium: boolean; premium_ends_at: string | null } | null>(null);
  const [open, setOpen] = useState<PackId | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    supabase.from("wallets").select("chats_balance,is_premium,premium_ends_at").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setWallet(data as any));
  }, [user, loading, nav]);

  const refreshWallet = async () => {
    if (!user) return;
    const { data } = await supabase.from("wallets").select("chats_balance,is_premium,premium_ends_at").eq("user_id", user.id).maybeSingle();
    setWallet(data as any);
  };

  const order = ["starter", "popular", "pro", "mega", "premium"] as PackId[];

  return (
    <div className="min-h-screen relative px-4 py-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/15 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-10">
          <Link to="/"><Logo /></Link>
          <Link to="/discover" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        <div className="text-center mb-10">
          <h1 className="font-display text-4xl sm:text-5xl font-bold">Buy chats</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Each message you send costs 1 chat (KES 0.25). New users get 5 free chats. Premium = unlimited.
          </p>
          {wallet && (
            <div className="mt-5 inline-flex items-center gap-3 glass rounded-full px-5 py-2.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold">{wallet.is_premium && wallet.premium_ends_at && new Date(wallet.premium_ends_at) > new Date()
                ? `Premium · until ${new Date(wallet.premium_ends_at).toLocaleDateString()}`
                : `${wallet.chats_balance} chats left`}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {order.map((id) => {
            const p = PACKAGES[id];
            const isPremium = p.premium;
            const isPopular = id === "popular";
            return (
              <div key={id}
                className={`glass rounded-3xl p-6 flex flex-col relative transition hover:border-primary/40 ${isPremium ? "border-primary/50 ring-2 ring-primary/30 lg:col-span-3" : ""}`}>
                {isPopular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Best value
                  </span>
                )}
                {isPremium && (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary-glow px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    <Crown className="h-3 w-3" /> Most exclusive
                  </span>
                )}

                <div className="flex items-center gap-2 mb-1">
                  {isPremium && <Crown className="h-5 w-5 text-primary" />}
                  <h3 className="font-display text-xl font-bold">{p.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-5">{p.tagline}</p>

                <div className="mb-5">
                  <span className="font-display text-4xl font-bold">KES {p.amount}</span>
                  {!isPremium && <span className="text-muted-foreground text-sm"> · one-time</span>}
                  {isPremium && <span className="text-muted-foreground text-sm"> / month</span>}
                </div>

                <ul className="space-y-2 text-sm mb-6 flex-1">
                  {isPremium ? (
                    <>
                      <Feat>Unlimited chats for 30 days</Feat>
                      <Feat>Read all incoming messages</Feat>
                      <Feat>Premium badge on your profile</Feat>
                      <Feat>Priority placement in Discover</Feat>
                    </>
                  ) : (
                    <>
                      <Feat>{p.chats.toLocaleString()} chats</Feat>
                      <Feat>≈ KES {(p.amount / p.chats).toFixed(3)} / message</Feat>
                      <Feat>Never expires</Feat>
                    </>
                  )}
                </ul>

                <button onClick={() => setOpen(id)}
                  className={`w-full rounded-xl py-3 font-semibold transition ${isPremium
                    ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90"
                    : "bg-card border border-border hover:border-primary/50 hover:bg-primary/5"}`}>
                  {isPremium ? "Go Premium" : "Buy now"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Payments via M-Pesa STK Push. Sandbox mode — no real charge yet.
        </p>
      </div>

      {open && <PayModal packId={open} onClose={() => setOpen(null)} onSuccess={() => { setOpen(null); refreshWallet(); }} />}
    </div>
  );
}

function Feat({ children }: { children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><Check className="h-4 w-4 text-success mt-0.5 shrink-0" /><span>{children}</span></li>;
}

function PayModal({ packId, onClose, onSuccess }: { packId: PackId; onClose: () => void; onSuccess: () => void }) {
  const p = PACKAGES[packId];
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const stk = useServerFn(initiateStkPush);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await stk({ data: { packId, phone } });
      if (res.ok) {
        toast.success(p.premium ? "Premium activated!" : `${p.chats} chats added!`);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-3xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold">{p.label}</h2>
        <p className="text-sm text-muted-foreground mt-1">KES {p.amount} {p.premium ? "/ month" : ""}</p>
        <form onSubmit={pay} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">M-Pesa phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="0712345678"
              className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary" />
          </label>
          <div className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
            🧪 Sandbox mode — no real STK prompt yet. Wallet will credit instantly.
          </div>
          <button disabled={busy} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : `Pay KES ${p.amount}`}
          </button>
          <button type="button" onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </form>
      </div>
    </div>
  );
}
