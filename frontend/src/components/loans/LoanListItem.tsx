import { LoanOffer } from "./types"; // adjust import path as needed

function naira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

interface LoanListItemProps {
  offer: LoanOffer;
  active: boolean;
  onClick: () => void;
}

function LoanListItem({ offer, active, onClick }: LoanListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 w-full rounded-[12px] px-3.5 py-3 text-left transition-colors ${
        active
          ? "bg-[#1a1a18] text-white"
          : "bg-transparent text-[#1a1a18] hover:bg-[#F1EFE8]"
      }`}
    >
      {/* Job title */}
      <div
        className={`mb-1 text-[13px] font-semibold leading-snug ${
          active ? "text-white" : "text-[#1a1a18]"
        }`}
      >
        {offer.jobTitle}
      </div>

      {/* Loan amount — hero number */}
      <div
        className={`mb-2 text-[18px] font-bold leading-none ${
          active ? "text-white" : "text-[#1a1a18]"
        }`}
      >
        {naira(offer.amount)}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={`flex items-center gap-1 text-[11px] ${
            active ? "text-[#B4B2A9]" : "text-[#888780]"
          }`}
        >
          <i className="ti ti-calendar text-[12px]" />
          {offer.termMonths} mo
        </span>

        <span
          className={`flex items-center gap-1 text-[11px] ${
            active ? "text-[#B4B2A9]" : "text-[#888780]"
          }`}
        >
          <i className="ti ti-refresh text-[12px]" />
          {naira(offer.monthlyRepayment)}/mo
        </span>

        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            active
              ? "bg-white/10 text-[#ccc]"
              : "bg-[#E1F5EE] text-[#0F6E56]"
          }`}
        >
          {bpsToPercent(offer.interestRateBps)} interest
        </span>
      </div>
    </button>
  );
}

export default LoanListItem;
