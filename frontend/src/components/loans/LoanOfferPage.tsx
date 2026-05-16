"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type StartupCosts = Record<string, number>;

type LoanOffer = {
  jobId: string;
  jobTitle: string;
  amount: number; // kobo
  termMonths: number;
  interestRateBps: number; // 350 = 3.5%
  monthlyRepayment: number; // kobo
  eligible: boolean;
  policyReason: string;
  disbursementDestination: string;
  startupCosts: StartupCosts;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function naira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}

function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

// "transportFloat" → "Transport Float"
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoanOfferPage({
  offers,
  onBack,
  onAccept,
}: {
  offers: LoanOffer[];
  onBack?: () => void;
  onAccept?: (offer: LoanOffer) => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const offer = offers[0];
  if (!offer) return null;

  const totalInterest =
    offer.monthlyRepayment * offer.termMonths - offer.amount;
  const startupEntries = Object.entries(offer.startupCosts);

  const handleAccept = () => {
    setAccepted(true);
    onAccept?.(offer);
  };

  // ── Accepted state ───────────────────────────────────────────────────────
  if (accepted) {
    return (
      <div className='min-h-screen bg-white flex flex-col items-center justify-center px-6 sm:px-0 text-center gap-8 font-inter'>
        <div className='w-14 h-14 rounded-full border-2 border-black flex items-center justify-center'>
          <svg width='22' height='18' viewBox='0 0 22 18' fill='none'>
            <path
              d='M1 9L8 16L21 1'
              stroke='black'
              strokeWidth='2.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>
        <div>
          <h2 className='text-3xl font-bold text-black mb-3 leading-tight font-ptserif'>
            Loan approved.
          </h2>
          <p className='text-zinc-500 text-sm leading-relaxed max-w-xs mx-auto'>
            {naira(offer.amount)} is being disbursed to{" "}
            <span className='text-black font-medium'>
              {offer.disbursementDestination}
            </span>
            . Your first repayment of{" "}
            <span className='text-black font-semibold'>
              {naira(offer.monthlyRepayment)}
            </span>{" "}
            is due in 30 days.
          </p>
        </div>
        <div className='w-full max-w-sm border border-zinc-200 rounded-2xl divide-y divide-zinc-100'>
          {[
            { label: "Amount", value: naira(offer.amount) },
            {
              label: "Monthly repayment",
              value: naira(offer.monthlyRepayment),
            },
            { label: "Term", value: `${offer.termMonths} months` },
            { label: "Disbursed to", value: offer.disbursementDestination },
          ].map(({ label, value }) => (
            <div
              key={label}
              className='flex justify-between items-center px-4 py-3.5'
            >
              <span className='text-zinc-400 text-sm'>{label}</span>
              <span className='text-black text-sm font-medium'>{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-white flex flex-col font-inter'>
      {/* Header */}
      <header className='flex items-center justify-between px-5 pt-10 pb-6 sm:hidden'>
        <button
          type='button'
          onClick={onBack}
          className='flex items-center gap-2 text-sm text-zinc-400 hover:text-black transition-colors'
        >
          <ArrowLeft className='w-4 h-4' />
          Back
        </button>
      </header>

      {/* Body */}
      <div className='flex-1 px-5 pt-8 sm:pt-16 pb-10 space-y-5 text-center'>
        {/* Job ID */}
        <p className='text-[0.5rem] uppercase tracking-widest text-zinc-400 font-medium'>
          Job ID: {offer.jobId}
        </p>

        {/* Hero amount */}
        <div className='space-y-1'>
          <h1 className='text-3xl sm:text-5xl font-bold text-black leading-none tracking-tight font-ptserif'>
            {naira(offer.amount)}
          </h1>
          <div className='space-y-1 pt-1'>
            <p className='text-xl font-bold text-black font-ptserif'>
              {offer.jobTitle}
            </p>
            <p className='text-sm text-zinc-500'>
              {bpsToPercent(offer.interestRateBps)} Interest Rate
            </p>
            <p className='text-sm text-zinc-500'>
              {offer.disbursementDestination}
            </p>
          </div>
        </div>

        {/* Job title + meta */}

        {/* Divider */}
        <div className='border-t border-zinc-100' />

        {/* Loan duration + Monthly payment */}
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1'>
            <p className='text-xs text-zinc-400 uppercase tracking-wider'>
              Loan Duration
            </p>
            <p className='text-lg sm:text-xl font-bold text-black font-ptserif'>
              {offer.termMonths} months
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-xs text-zinc-400 uppercase tracking-wider'>
              Monthly Payment
            </p>
            <p className='text-lg sm:text-xl font-bold text-black font-ptserif'>
              {naira(offer.monthlyRepayment)}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className='border-t border-zinc-100' />

        {/* Total interest */}
        <div className='space-y-1'>
          <p className='text-xs text-zinc-400 uppercase tracking-wider'>
            Total Interest
          </p>
          <p className='text-lg sm:text-xl font-bold text-black font-ptserif'>
            {naira(totalInterest)}
          </p>
        </div>

        {/* Divider */}
        <div className='border-t border-zinc-100' />

        {/* Startup cost breakdown */}
        {startupEntries.length > 0 && (
          <div className='space-y-4'>
            <p className='text-base font-bold text-black font-ptserif underline'>
              Startup Cost Breakdown
            </p>
            <ol className='space-y-3'>
              {startupEntries.map(([key, val], i) => (
                <li key={key} className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <span className='text-xs text-zinc-300 w-4 tabular-nums'>
                      {i + 1}.
                    </span>
                    <span className='text-sm text-zinc-700'>
                      {formatKey(key)}
                    </span>
                  </div>
                  <span className='text-sm font-semibold text-black tabular-nums'>
                    {naira(val)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Policy note */}
        <p className='text-xs text-zinc-400 leading-relaxed pl-3'>
          {offer.policyReason}
        </p>
      </div>
 
      <div className='px-5 py-5'>
        <button
          type='button'
          onClick={handleAccept}
          className='w-full h-11 bg-black/90 text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-black transition-all group'
        >
          Get Loan
          <ArrowRight className='w-4 h-4 group-hover:translate-x-1.5 transition-all duration-300 ease-in' />
        </button>
      </div>
    </div>
  );
}
