import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () => ({
    meta: [
      { title: "Terms & User Agreement — After Dark" },
      { name: "description", content: "The rules for using After Dark. Read before joining." },
    ],
  }),
});

function Terms() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <Link to="/"><Logo /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        </div>

        <article className="glass rounded-3xl p-8 sm:p-10 prose-invert">
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Terms &amp; User Agreement</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <Section n="1." title="Eligibility — 18+ only">
            You must be at least 18 years old (or the age of majority in your jurisdiction) to use After Dark. Accounts found to belong to minors are deleted immediately and reported where required by law.
          </Section>

          <Section n="2." title="Who we are, what this is">
            After Dark is a private, invite-tone, location-aware platform for verified adults to connect for meetups, conversation, or companionship. It is not a public social network. Profiles are not indexed or shared outside the platform.
          </Section>

          <Section n="3." title="Acceptable use">
            <ul className="list-disc pl-6 space-y-1.5">
              <li>No harassment, threats, hate speech, or discrimination.</li>
              <li>No solicitation of minors. Zero tolerance — instant ban and report to authorities.</li>
              <li>No commercial sex work, trafficking, or paid escort services.</li>
              <li>No nude photos in your public profile picture. Mutual private sharing only.</li>
              <li>No impersonation, fake profiles, or stolen photos.</li>
              <li>No scams, phishing, financial fraud, or off-platform payment requests.</li>
              <li>No spam, scraping, automation, or reverse engineering.</li>
            </ul>
          </Section>

          <Section n="4." title="Verification & safety">
            We may require selfie verification at any time. We collect device, IP, and usage signals to detect abuse, ban evasion, and fraud. Reports are reviewed by our trust &amp; safety team.
          </Section>

          <Section n="5." title="Meeting people in person — your responsibility">
            After Dark facilitates introductions only. We do not conduct background checks. You meet other members at your own risk. Always meet in public first, tell a friend where you are, and trust your gut. We are not liable for any harm, loss, or damage arising from meetings or interactions between members.
          </Section>

          <Section n="6." title="Payments, trial & wallet">
            New accounts get a 2-day free trial. After that, access requires an active wallet balance or premium pass. All payments are processed through licensed providers (M-Pesa Daraja). All purchases are final and non-refundable except where required by law.
          </Section>

          <Section n="7." title="Content you post">
            You retain ownership of your photos, bio, and messages, but grant us a non-exclusive licence to host and display them inside the app for the purpose of running the service. You are responsible for the legality of what you upload.
          </Section>

          <Section n="8." title="Termination">
            We may suspend or permanently ban accounts that violate these terms — without refund — at our sole discretion. You may delete your account at any time from settings.
          </Section>

          <Section n="9." title="Disclaimer & limitation of liability">
            The service is provided “as is”, without warranties of any kind. To the maximum extent permitted by law, After Dark, its operators, and partners are not liable for any indirect, incidental, or consequential damages.
          </Section>

          <Section n="10." title="Changes">
            We may update these terms. Material changes will be announced in-app. Continued use after changes means you accept them.
          </Section>

          <Section n="11." title="Contact">
            Questions, reports, or legal notices: <a className="text-primary hover:underline" href="mailto:safety@afterdark.app">safety@afterdark.app</a>
          </Section>

          <p className="mt-10 text-xs text-muted-foreground">
            By creating an account you confirm you have read and agree to these Terms and our{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
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
