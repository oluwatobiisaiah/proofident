export default function DashboardPage() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="font-ptserif text-2xl font-semibold text-black">
          Good morning, Chioma
        </h1>
        <p className="font-inter text-sm text-black/50 mt-1">
          Here's what's happening across your account today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-black/10 p-5">
          <p className="font-inter text-xs text-black/40 uppercase tracking-widest mb-2">
            Active Applications
          </p>
          <p className="font-ptserif text-3xl font-semibold text-black">4</p>
          <p className="font-inter text-xs text-black/40 mt-1">2 pending review</p>
        </div>
        <div className="rounded-xl border border-black/10 p-5">
          <p className="font-inter text-xs text-black/40 uppercase tracking-widest mb-2">
            Loan Balance
          </p>
          <p className="font-ptserif text-3xl font-semibold text-black">₦2.4M</p>
          <p className="font-inter text-xs text-black/40 mt-1">Across 2 active loans</p>
        </div>
        <div className="rounded-xl border border-black/10 p-5">
          <p className="font-inter text-xs text-black/40 uppercase tracking-widest mb-2">
            Saved Jobs
          </p>
          <p className="font-ptserif text-3xl font-semibold text-black">12</p>
          <p className="font-inter text-xs text-black/40 mt-1">3 closing soon</p>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 min-h-64 p-5">
        <p className="font-ptserif text-base font-semibold text-black mb-4">
          Recent Activity
        </p>
        <div className="space-y-3">
          {["Applied to Senior Engineer at Paystack", "Loan repayment of ₦85,000 processed", "Job match: Product Designer at Flutterwave"].map(
            (item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-black/30 mt-2 shrink-0" />
                <p className="font-inter text-sm text-black/70">{item}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
