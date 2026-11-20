import { Wallet, ArrowRight } from "lucide-react";

export default function BillingSettings() {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="hms-heading mb-1">Billing &amp; Plans</h2>
        <p className="hms-subheading">
          Manage your subscription, view invoices, and update payment details.
        </p>
      </div>

      {/* Coming Soon card */}
      <section className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-10 flex flex-col items-center justify-center text-center gap-5">
        <div className="p-5 rounded-full bg-amber-100">
          <Wallet size={36} className="text-amber-500" />
        </div>

        <div>
          <span className="inline-block text-xs font-semibold px-3 py-1 bg-amber-200 text-amber-800 rounded-full mb-3 uppercase tracking-wide">
            Coming Soon
          </span>
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            Billing features are on the way
          </h3>
          <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
            Soon you'll be able to view your subscription plan, download invoices,
            and manage payment methods — all from this page.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mt-2">
          {[
            { label: "Subscription Plan", detail: "View and manage your current plan" },
            { label: "Invoices & Receipts", detail: "Download billing history" },
            { label: "Payment Methods", detail: "Add or update payment details" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 p-4 bg-white rounded-lg border border-amber-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                <ArrowRight size={12} className="text-gray-300" />
              </div>
              <span className="text-xs text-gray-400">{item.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
