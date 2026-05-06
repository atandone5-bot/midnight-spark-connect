import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () => ({
    meta: [
      { title: "Privacy Policy — After Dark" },
      { name: "description", content: "What we collect, why, and how we keep it safe." },
    ],
  }),
});

function Privacy() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <Link to="/"><Logo /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        </div>

        <article className="glass rounded-3xl p-8 sm:p-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <Section n="1." title="What we collect">
            <ul className="list-disc pl-6 space-y-1.5">
              <li><b>Account:</b> email, password (hashed), nickname, age, gender, preference, intent, bio.</li>
              <li><b>Location:</b> city you enter, and (with your permission) approximate GPS coordinates to show nearby members.</li>
              <li><b>Photos:</b> profile and private photos you upload.</li>
              <li><b>Messages:</b> chats between you and other members.</li>
              <li><b>Device & usage:</b> IP, device type, browser, login times, actions in the app — used for security and abuse prevention.</li>
              <li><b>Payments:</b> wallet top-ups via M-Pesa. We never store your full M-Pesa PIN or password.</li>
            </ul>
          </Section>

          <Section n="2." title="Why we collect it">
            To run the service, match you with nearby members, prevent fraud and abuse, comply with the law, and improve the product. We never sell your personal data.
          </Section>

          <Section n="3." title="Who can see what">
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Your nickname, age, city, intent and profile photo are visible to other signed-in members.</li>
              <li>Your exact GPS coordinates are <b>never</b> shown — only approximate distance.</li>
              <li>Your email, phone, and exact location are never shown to other members.</li>
              <li>Private photos are only visible to people you explicitly share with.</li>
            </ul>
          </Section>

          <Section n="4." title="Cookies & tracking">
            We use essential cookies for sign-in and security. We do not run third-party advertising trackers.
          </Section>

          <Section n="5." title="Data retention">
            We keep your data while your account is active. When you delete your account, profile data is removed within 30 days. Some data (transactions, abuse reports, legal records) may be retained longer where required by law.
          </Section>

          <Section n="6." title="Security">
            Data is encrypted in transit (HTTPS) and at rest. Access is restricted to staff who need it. No system is perfectly secure — please use a strong, unique password and report suspicious activity.
          </Section>

          <Section n="7." title="Your rights">
            You can view, edit, export, or delete your data from in-app settings. For other requests, write to{" "}
            <a className="text-primary hover:underline" href="mailto:privacy@afterdark.app">privacy@afterdark.app</a>.
          </Section>

          <Section n="8." title="Children">
            After Dark is strictly for adults 18+. We do not knowingly collect data from minors. If you believe a minor has registered, report it immediately.
          </Section>

          <Section n="9." title="Changes">
            We may update this policy. Material changes will be announced in-app.
          </Section>

          <p className="mt-10 text-xs text-muted-foreground">
            See also our <Link to="/terms" className="text-primary hover:underline">Terms &amp; User Agreement</Link>.
          </p>
        </article>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold">
        <span className="text-primary mr-2">{n}</span>{title}
      </h2>
      <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}
