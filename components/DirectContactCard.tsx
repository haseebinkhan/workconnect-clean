import Link from "next/link";

type DirectContactCardProps = {
  workerName: string;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  showPhonePublicly?: boolean | null;
  showWhatsappPublicly?: boolean | null;
  hasAcceptedConnection?: boolean;
  isOwner?: boolean;
  bookingId?: string | null;
};

function normalizeWhatsapp(value?: string | null) {
  if (!value) return null;
  return value.replace(/[^\d]/g, "");
}

export default function DirectContactCard({
  workerName,
  phoneNumber,
  whatsappNumber,
  showPhonePublicly,
  showWhatsappPublicly,
  hasAcceptedConnection = false,
  isOwner = false,
  bookingId,
}: DirectContactCardProps) {
  const cleanedWhatsapp = normalizeWhatsapp(whatsappNumber);

  const canShowPhone =
    isOwner || !!showPhonePublicly || hasAcceptedConnection;

  const canShowWhatsapp =
    isOwner || !!showWhatsappPublicly || hasAcceptedConnection;

  const whatsappMessage = encodeURIComponent(
    `Hi ${workerName}, I found your profile on WorkConnect and would like to discuss some work.`
  );

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900">Contact {workerName}</h3>

      <p className="mt-2 text-sm leading-7 text-slate-600">
        Messaging is always available. Direct phone and WhatsApp depend on the
        worker’s contact visibility settings and accepted requests.
      </p>

      <div className="mt-5 space-y-4">
        {canShowPhone && phoneNumber ? (
          <a
            href={`tel:${phoneNumber}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-slate-100"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Phone
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {phoneNumber}
              </p>
            </div>
            <span className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              Call
            </span>
          </a>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Phone becomes visible when the worker makes it public or accepts a request.
          </div>
        )}

        {canShowWhatsapp && cleanedWhatsapp ? (
          <a
            href={`https://wa.me/${cleanedWhatsapp}?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 transition hover:bg-emerald-100"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                WhatsApp
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">
                {whatsappNumber}
              </p>
            </div>
            <span className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
              Open
            </span>
          </a>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            WhatsApp becomes visible when the worker makes it public or accepts a request.
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3">
        <Link
          href={bookingId ? `/messages/${bookingId}` : "/messages"}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Open messages
        </Link>
      </div>
    </div>
  );
}