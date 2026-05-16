"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import LoanListItem from "@/components/loans/LoanListItem";
import { LoanOfferPage } from "@/components/loans/LoanOfferPage";
import { LoanOffer } from "@/components/loans/loans-types";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchLoanOffers(token: string): Promise<LoanOffer[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/loan-offers`, {
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

function ListSkeleton() {
  return (
    <div className='flex flex-col gap-1 px-2'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className='animate-pulse space-y-2 rounded-[12px] px-3.5 py-3'
        >
          <div className='h-3 w-3/4 rounded bg-[#E8E6DF]' />
          <div className='h-5 w-1/2 rounded bg-[#E8E6DF]' />
          <div className='flex gap-2'>
            <div className='h-3 w-10 rounded bg-[#E8E6DF]' />
            <div className='h-3 w-16 rounded bg-[#E8E6DF]' />
            <div className='h-3 w-14 rounded bg-[#E1F5EE]' />
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className='mx-auto max-w-170 animate-pulse space-y-5 px-10 py-9'>
      <div className='h-6 w-1/3 rounded bg-[#E8E6DF]' />
      <div className='h-10 w-2/3 rounded bg-[#E8E6DF]' />
      <div className='h-4 w-1/4 rounded bg-[#E8E6DF]' />
      <div className='h-px w-full bg-[#E8E6DF]' />
      <div className='grid grid-cols-2 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='space-y-1.5'>
            <div className='h-3 w-1/2 rounded bg-[#E8E6DF]' />
            <div className='h-5 w-3/4 rounded bg-[#E8E6DF]' />
          </div>
        ))}
      </div>
      <div className='h-px w-full bg-[#E8E6DF]' />
      <div className='space-y-2'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='flex justify-between'>
            <div className='h-3 w-1/3 rounded bg-[#E8E6DF]' />
            <div className='h-3 w-1/4 rounded bg-[#E8E6DF]' />
          </div>
        ))}
      </div>
      <div className='mt-4 h-11 w-full rounded-2xl bg-[#E8E6DF]' />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function LoansDesktopView() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken as string | undefined;

  const {
    data: offers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["loan-offers"],
    queryFn: () => fetchLoanOffers(accessToken!),
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  // Default to first offer once data arrives
  const [activeId, setActiveId] = useState<string | null>(null);
  const resolvedActiveId = activeId ?? offers[0]?.jobId ?? null;
  const activeOffer = offers.find((o) => o.jobId === resolvedActiveId) ?? null;

  return (
    <div className="flex h-screen bg-white font-['DM_Sans',system-ui,sans-serif]">
      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div className='flex w-[35%] max-w-[320px] flex-col border-r border-[#E8E6DF] bg-white'>
        {/* Header */}
        <div className='px-4 pb-3 pt-6'>
          <div className='mb-1 text-[11px] font-bold uppercase tracking-widest text-[#B4B2A9]'>
            Proofident
          </div>
          <h2 className='mb-4 text-[18px] font-bold text-[#1a1a18]'>
            Loan Offers
          </h2>
        </div>

        {/* List */}
        <div className='flex-1 overflow-y-auto px-2 pb-4'>
          {isLoading ? (
            <ListSkeleton />
          ) : isError ? (
            <p className='px-4 pt-4 text-[13px] text-red-400'>
              Could not load loan offers. Please try again.
            </p>
          ) : (
            offers.map((offer) => (
              <LoanListItem
                key={offer.jobId}
                offer={offer}
                active={offer.jobId === resolvedActiveId}
                onClick={() => setActiveId(offer.jobId)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center gap-1.5 border-t border-[#E8E6DF] px-4 py-3 text-[12px] text-[#B4B2A9]'>
          <i className='ti ti-sparkles text-[13px]' />
          {isLoading
            ? "Loading…"
            : `${offers.length} offer${offers.length !== 1 ? "s" : ""} available`}
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className='flex-1 overflow-y-auto'>
        {isLoading ? (
          <DetailSkeleton />
        ) : activeOffer ? (
          <div className='mx-auto max-w-sm'>
            <LoanOfferPage offers={[activeOffer]} onBack={undefined} />
          </div>
        ) : (
          !isError && (
            <div className='flex h-full items-center justify-center text-[14px] text-[#888780]'>
              Select a loan offer to see details.
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default LoansDesktopView;
