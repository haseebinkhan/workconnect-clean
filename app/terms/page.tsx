import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Legal</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              Terms & Conditions
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Last updated: 24 March 2026
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              These Terms & Conditions govern your use of WorkConnect and apply to
              workers, hirers and all visitors using the platform in the UK.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">1. About the platform</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              WorkConnect is an online platform that helps hirers and workers connect
              locally. Unless clearly stated otherwise, WorkConnect acts as a platform
              provider and is not a party to separate agreements made directly between
              workers and hirers.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">2. Eligibility and accounts</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>You must provide accurate information when creating an account.</p>
              <p>You are responsible for maintaining the confidentiality of your login credentials.</p>
              <p>You must not impersonate another person or use the platform unlawfully.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">3. Worker and hirer responsibilities</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>Workers are responsible for ensuring that profile details, rates, categories, availability and contact information are accurate.</p>
              <p>Hirers are responsible for ensuring that job requests and communications are truthful, lawful and respectful.</p>
              <p>Both parties are responsible for complying with applicable law, including employment, tax, health and safety, safeguarding and consumer obligations where relevant.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">4. Bookings and communications</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>Booking requests may move through statuses such as pending, accepted, in progress, worker marked done, completed and cancelled.</p>
              <p>Users must use the messaging and booking features responsibly and must not send abusive, misleading, fraudulent or unlawful content.</p>
              <p>We may store messages and booking records for safety, support, moderation and compliance purposes.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">5. Direct contact and off-platform communication</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              WorkConnect may allow direct contact details, such as phone or WhatsApp,
              to be shown after an accepted booking where enabled. Users remain solely
              responsible for any direct arrangements, communications and agreements
              made outside the platform.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">6. Reviews and ratings</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Reviews should reflect genuine experience. You must not post false,
              misleading, defamatory or abusive reviews. We may remove or moderate
              reviews where appropriate.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">7. Fees and payments</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              If platform fees, subscription charges or payment services are introduced,
              additional payment terms may apply. Any such terms should be clearly
              presented before charges are made.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">8. Prohibited use</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>You must not use WorkConnect to commit fraud, harassment, discrimination, abuse, spam, unlawful surveillance or other unlawful activity.</p>
              <p>You must not attempt to interfere with platform security, access controls, data or infrastructure.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">9. Suspension and termination</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              We may suspend, restrict or remove accounts that breach these terms, pose
              safety risks, create legal risk, or misuse the platform.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">10. Liability</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              To the extent permitted by law, WorkConnect provides the platform on an
              “as available” basis and does not guarantee uninterrupted availability,
              suitability of workers or hirers, or the quality, legality or outcome of
              services arranged between users. Nothing in these terms excludes or limits
              liability where it would be unlawful to do so.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">11. Consumer rights</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              If you are dealing as a consumer, you may have legal rights under UK law
              that cannot be excluded. Where separate goods or services are sold online
              by the platform or by users through the platform, additional consumer
              information and cancellation rights may apply depending on the nature of
              the contract.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">12. Changes to these terms</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              We may update these Terms & Conditions from time to time. Continued use of
              the platform after updates may indicate acceptance of the revised terms.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">13. Governing law</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              These terms are governed by the laws of the United Kingdom, subject to any
              mandatory consumer protections that apply in your jurisdiction.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
