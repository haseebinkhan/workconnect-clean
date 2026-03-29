import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-14 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-14">

        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">

          {/* ?? BIG LOGO */}
          <div>
            <Link href="/" className="mb-6 block">
              <Image
                src="/logo.png"
                alt="WorkConnect"
                width={600}
                height={180}
                className="h-[85px] w-auto object-contain sm:h-[100px] md:h-[115px] lg:h-[125px]"
              />
            </Link>

            <p className="text-sm leading-6 text-slate-600">
                         </p>
          </div>

          {/* PLATFORM */}
          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Platform</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/workers" className="hover:text-slate-900">
                  Find Workers
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="hover:text-slate-900">
                  Find Jobs
                </Link>
              </li>
              <li>
                <Link href="/post-job" className="hover:text-slate-900">
                  Post a Job
                </Link>
              </li>
            </ul>
          </div>

          {/* ACCOUNT */}
          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Account</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/dashboard" className="hover:text-slate-900">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-slate-900">
                  Profile
                </Link>
              </li>
              <li>
                <Link href="/messages" className="hover:text-slate-900">
                  Messages
                </Link>
              </li>
            </ul>
          </div>

          {/* LEGAL */}
          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/terms" className="hover:text-slate-900">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-slate-900">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            {new Date().getFullYear()} WorkConnect. All rights reserved.
        </div>

      </div>
    </footer>
  );
}

