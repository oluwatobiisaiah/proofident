"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LoanOfferPage } from "@/components/loans/LoanOfferPage";
import { LoanOffer } from "@/components/loans/loans-types";
import { NEXT_PUBLIC_API_URL } from "@/lib/envVariables";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchLoanOffers(token: string): Promise<LoanOffer[]> {
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/me/loan-offers`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.offers;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function MobileListSkeleton() {
  return (
    <div className='flex flex-col gap-3 px-5'>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className='animate-pulse space-y-2 rounded-[16px] bg-white p-4 shadow-sm'
        >
          <div className='h-3 w-2/3 rounded bg-[#E8E6DF]' />
          <div className='h-6 w-1/2 rounded bg-[#E8E6DF]' />
          <div className='flex gap-2'>
            <div className='h-3 w-12 rounded bg-[#E8E6DF]' />
            <div className='h-3 w-20 rounded bg-[#E8E6DF]' />
          </div>
          <div className='mt-1 h-8 w-full rounded-[8px] bg-[#E8E6DF]' />
        </div>
      ))}
    </div>
  );
}

// ─── Loan card ────────────────────────────────────────────────────────────────

function LoanCard({
  offer,
  onSelect,
}: {
  offer: LoanOffer;
  onSelect: () => void;
}) {
  return (
    <div className='rounded-[16px] bg-white p-4 shadow-sm'>
      <p className='mb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888780]'>
        {offer.jobTitle}
      </p>

      <p className='mb-2 text-[22px] font-bold leading-none text-[#1a1a18]'>
        {naira(offer.amount)}
      </p>

      <div className='mb-3 flex flex-wrap gap-2'>
        <span className='flex items-center gap-1 rounded-full bg-[#F1EFE8] px-2.5 py-1 text-[11px] font-medium text-[#5F5E5A]'>
          <i className='ti ti-calendar text-[12px]' />
          {offer.termMonths} months
        </span>

        <span className='flex items-center gap-1 rounded-full bg-[#F1EFE8] px-2.5 py-1 text-[11px] font-medium text-[#5F5E5A]'>
          <i className='ti ti-refresh text-[12px]' />
          {naira(offer.monthlyRepayment)}/mo
        </span>

        <span className='rounded-full bg-[#E1F5EE] px-2.5 py-1 text-[11px] font-semibold text-[#0F6E56]'>
          {bpsToPercent(offer.interestRateBps)} interest
        </span>
      </div>

      <p className='mb-3 text-[12px] text-[#888780]'>
        Disbursed to{" "}
        <span className='font-medium text-[#5F5E5A]'>
          {offer.disbursementDestination}
        </span>
      </p>

      <button
        onClick={onSelect}
        className='w-full rounded-[10px] bg-[#1a1a18] py-2.5 text-[13px] font-semibold text-white'
      >
        View offer →
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function LoansMobileView() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken as string | undefined;

  const {
    data: offers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["loan-offers"],
    queryFn: () => fetchLoanOffers(accessToken!),
    // Don't fire until we actually have a token
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 min — loan offers don't change often
  });

  const [selected, setSelected] = useState<LoanOffer | null>(null);

  // ── Detail screen ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="min-h-screen overflow-y-auto bg-white font-['DM_Sans',system-ui,sans-serif]">
        <LoanOfferPage offers={[selected]} onBack={() => setSelected(null)} />
      </div>
    );
  }

  // ── List screen ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F7F2] font-['DM_Sans',system-ui,sans-serif]">
      <div className='px-5 pb-5 pt-7'>
        <div className='mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B4B2A9]'>
          Proofident
        </div>
        <h1 className='mb-1 text-[22px] font-extrabold text-[#1a1a18]'>
          Loan Offers
        </h1>
        <p className='text-[13px] text-[#888780]'>
          {isLoading
            ? "Loading your offers…"
            : isError
              ? ""
              : `${offers.length} offer${offers.length !== 1 ? "s" : ""} available for you`}
        </p>
      </div>

      {isLoading ? (
        <MobileListSkeleton />
      ) : isError ? (
        <p className='px-5 text-[13px] text-red-400'>
          Could not load loan offers. Please try again.
        </p>
      ) : offers.length === 0 ? (
        <p className='px-5 text-[13px] text-[#888780]'>
          No loan offers available right now.
        </p>
      ) : (
        <div className='flex flex-col gap-3 px-5 pb-8'>
          {offers.map((offer) => (
            <LoanCard
              key={offer.jobId}
              offer={offer}
              onSelect={() => setSelected(offer)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default LoansMobileView;
