import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function InstallBanner() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHelp, setIosHelp] = useState(false);

  // Capture the native prompt event
  useEffect(() => {
    function onBIP(e: Event) {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    }
    function onInstalled() {
      setVisible(false);
      setDeferred(null);
      try { localStorage.setItem("ad_installed", "1"); } catch {}
    }
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Re-show on every route change unless installed
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    try { if (localStorage.getItem("ad_installed") === "1") return; } catch {}
    setIosHelp(false);
    setVisible(true);
  }, [location]);

  if (!visible) return null;

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        try { localStorage.setItem("ad_installed", "1"); } catch {}
        setVisible(false);
      }
      setDeferred(null);
      return;
    }
    if (isIOS()) {
      setIosHelp(true);
      return;
    }
    setIosHelp(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-3 sm:px-4 sm:pb-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-xl glass rounded-2xl border border-primary/30 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.4)] p-3 sm:p-4 flex items-center gap-3">
        <img src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Install After Dark</p>
          <p className="text-[11px] text-muted-foreground leading-snug truncate">
            {iosHelp
              ? "Tap Share → Add to Home Screen"
              : "Faster, private, full-screen — get the app."}
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition shrink-0"
        >
          Install
        </button>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground text-lg leading-none px-1 shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  );
}
