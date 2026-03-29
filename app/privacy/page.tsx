import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Legal</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Last updated: 24 March 2026
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              This Privacy Policy explains how WorkConnect collects, uses, stores,
              and protects personal information when you use our website and services
              in the United Kingdom.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">1. Who we are</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              WorkConnect is a local worker and hirer marketplace platform. In this
              policy, “we”, “us”, and “our” mean WorkConnect.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Contact email: replace-this-with-your-email@example.com
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">2. Personal data we collect</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>We may collect:</p>
              <p>• account details such as name, email address and password login information;</p>
              <p>• profile information such as city, postcode, area, worker category, headline, rates, availability, phone number and WhatsApp number;</p>
              <p>• booking and request information such as titles, messages, status updates and related booking details;</p>
              <p>• chat messages sent through the platform;</p>
              <p>• reviews, ratings and reports;</p>
              <p>• technical and usage information such as device, browser, IP address and log information.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">3. How we use your information</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>We use personal data to:</p>
              <p>• create and manage user accounts;</p>
              <p>• show worker and hirer profiles and local availability;</p>
              <p>• process booking requests, chat messages and notifications;</p>
              <p>• send service emails such as password reset emails, request alerts and message notifications;</p>
              <p>• improve platform safety, detect misuse and investigate complaints;</p>
              <p>• maintain and improve the service, analytics and performance.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">4. Lawful bases</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>We generally process personal data on one or more of the following bases:</p>
              <p>• performance of a contract, where processing is needed to provide the platform and requested services;</p>
              <p>• legitimate interests, including running, securing and improving the platform;</p>
              <p>• legal obligation, where we need to comply with applicable law;</p>
              <p>• consent, where we specifically ask for it.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">5. Sharing your information</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>We may share information with trusted service providers who help us operate the platform, such as hosting, authentication, database, email and analytics providers.</p>
              <p>We may also share information where required by law, regulation, court order, or to protect the rights, safety and security of users or the platform.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">6. Direct contact information</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Worker phone numbers and WhatsApp numbers are intended to be shown only
              after an accepted booking where enabled by the worker. Users are
              responsible for ensuring any direct contact information they provide is
              accurate and lawful to share.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">7. Data retention</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              We keep personal data only for as long as reasonably necessary for the
              purposes set out in this policy, including account management, dispute
              handling, legal compliance, fraud prevention and record keeping.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">8. Your rights</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>Depending on the circumstances, you may have the right to:</p>
              <p>• access your personal data;</p>
              <p>• request correction of inaccurate data;</p>
              <p>• request erasure of data;</p>
              <p>• object to or restrict certain processing;</p>
              <p>• request data portability;</p>
              <p>• withdraw consent where processing is based on consent.</p>
              <p>To exercise your rights, contact: replace-this-with-your-email@example.com</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">9. Complaints</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              If you are unhappy with how we use your personal data, we would like the
              opportunity to address your concern first. You also have the right to
              complain to the Information Commissioner’s Office (ICO) in the UK.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">10. Cookies and analytics</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              We may use cookies and similar technologies to keep users signed in,
              improve performance, understand usage and maintain security. You can
              control cookies through your browser settings where applicable.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">11. Changes to this policy</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              We may update this Privacy Policy from time to time. We will post the
              latest version on this page and update the “Last updated” date above.
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

