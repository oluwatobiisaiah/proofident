"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Briefcase,
  Clock,
  BadgePercent,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StartupCosts = Record<string, number>;

type LoanDetail = {
  jobId: string;
  jobTitle: string;
  amount: number;             // kobo
  termMonths: number;
  interestRateBps: number;    // basis points — 350 bps = 3.5%
  monthlyRepayment: number;   // kobo
  eligible: boolean;
  policyReason: string;
  disbursementDestination: string;
  startupCosts: StartupCosts;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Convert kobo → Naira, formatted
function naira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

// 350 bps → "3.5%"
function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

// "transportFloat" → "Transport Float"
function formatCostKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-black/20 rounded-xl p-3.5 border border-white/5">
      <div className="flex items-center gap-1.5 text-white/40">
        {icon}
        <span className="text-[10px] uppercase tracking-widest font-medium">
          {label}
        </span>
      </div>
      <span className="text-white font-bold text-base leading-tight">
        {value}
      </span>
    </div>
  );
}

function StartupCostRow({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-white/60 text-sm">{label}</span>
      <span className="text-white text-sm font-semibold tabular-nums">
        {naira(amount)}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LoanDetailPage({
  offers,
  onAccept,
}: {
  offers: LoanDetail[];
  onAccept?: (offer: LoanDetail) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(offers[0]?.jobId ?? "");
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const offer = offers.find((o) => o.jobId === selectedId) ?? offers[0];
  if (!offer) return null;

  const totalInterest =
    offer.monthlyRepayment * offer.termMonths - offer.amount;
  const totalRepayment = offer.monthlyRepayment * offer.termMonths;
  const interestPct = bpsToPercent(offer.interestRateBps);
  const startupEntries = Object.entries(offer.startupCosts);

  const handleAccept = () => {
    if (!agreed) return;
    setAccepted(true);
    onAccept?.(offer);
  };

  // ── Accepted state ───────────────────────────────────────────────────────
  if (accepted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-white text-2xl font-black mb-2">
            Loan Approved!
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {naira(offer.amount)} is being disbursed to{" "}
            <span className="text-white/80">{offer.disbursementDestination}</span>.
            Your first repayment of{" "}
            <span className="text-amber-400 font-semibold">
              {naira(offer.monthlyRepayment)}
            </span>{" "}
            is due in 30 days.
          </p>
        </div>
        <div className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-left space-y-2">
          {[
            { label: "Amount", value: naira(offer.amount) },
            { label: "Monthly repayment", value: naira(offer.monthlyRepayment) },
            { label: "Term", value: `${offer.termMonths} months` },
            { label: "Destination", value: offer.disbursementDestination },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-white/40">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-zinc-950 flex flex-col"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .syne { font-family: 'Syne', sans-serif; }
      `}</style>

      {/* ── Ambient glow ──────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 opacity-20 blur-3xl rounded-full"
          style={{ background: "radial-gradient(circle, #f59e0b, transparent 70%)" }}
        />
      </div>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-10 pb-4">
        <div>
          <span className="syne text-xl font-black text-white tracking-tight">
            proof<span className="text-amber-500">ident</span>
          </span>
        </div>
        <span className="text-white/30 text-xs font-mono uppercase tracking-widest">
          Loan Offer
        </span>
      </header>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-36 space-y-5 pt-2">

        {/* ── Job context ───────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-black/30 border border-white/5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">
              Job-linked loan
            </p>
            <p className="text-white font-semibold text-sm leading-snug">
              {offer.jobTitle}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              Disbursed to: {offer.disbursementDestination}
            </p>
          </div>
        </div>

        {/* ── Hero amount ───────────────────────────────────────────────── */}
        <div className="text-center py-4">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            Loan Amount
          </p>
          <p className="syne text-5xl font-black text-white leading-none mb-1">
            {naira(offer.amount)}
          </p>
          <p className="text-white/30 text-xs">
            Remaining to be repaid:{" "}
            <span className="text-white/60 font-medium">{naira(totalRepayment)}</span>
          </p>
        </div>

        {/* ── Stats grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatPill
            icon={<Clock className="w-3 h-3" />}
            label="Term"
            value={`${offer.termMonths} months`}
          />
          <StatPill
            icon={<BadgePercent className="w-3 h-3" />}
            label="Interest rate"
            value={`${interestPct} / mo`}
          />
          <StatPill
            icon={<Wallet className="w-3 h-3" />}
            label="Monthly payment"
            value={naira(offer.monthlyRepayment)}
          />
          <StatPill
            icon={<ArrowRight className="w-3 h-3" />}
            label="Total interest"
            value={naira(totalInterest)}
          />
        </div>

        {/* ── Repayment progress visual ──────────────────────────────────── */}
        <div className="rounded-2xl bg-black/30 border border-white/5 p-4 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Repayment schedule</span>
            <span className="text-white/60">
              {offer.termMonths} payments of {naira(offer.monthlyRepayment)}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: offer.termMonths }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full bg-white/10"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(245,158,11,0.6), rgba(245,158,11,0.2))",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-white/30">
            <span>Month 1</span>
            <span>Month {offer.termMonths}</span>
          </div>
        </div>

        {/* ── Startup cost breakdown ─────────────────────────────────────── */}
        {startupEntries.length > 0 && (
          <div className="rounded-2xl bg-black/30 border border-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setBreakdownOpen((p) => !p)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-white text-sm font-semibold">
                  Startup Cost Breakdown
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {startupEntries.length} items · Total {naira(offer.amount)}
                </p>
              </div>
              {breakdownOpen ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>

            {breakdownOpen && (
              <div className="px-4 pb-4">
                <div className="border border-white/5 rounded-xl px-3 bg-black/20">
                  {startupEntries.map(([key, val]) => (
                    <StartupCostRow
                      key={key}
                      label={formatCostKey(key)}
                      amount={val}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Policy reason ─────────────────────────────────────────────── */}
        <div className="flex gap-2.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-white/50 text-xs leading-relaxed">
            {offer.policyReason}
          </p>
        </div>

        {/* ── Multiple offers selector (if more than one) ────────────────── */}
        {offers.length > 1 && (
          <div className="space-y-2">
            <p className="text-white/40 text-xs uppercase tracking-widest">
              Other offers
            </p>
            {offers
              .filter((o) => o.jobId !== selectedId)
              .map((o) => (
                <button
                  key={o.jobId}
                  type="button"
                  onClick={() => setSelectedId(o.jobId)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/5 hover:border-amber-500/30 transition-colors text-left"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{o.jobTitle}</p>
                    <p className="text-white/40 text-xs mt-0.5">{naira(o.amount)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30" />
                </button>
              ))}
          </div>
        )}
      </div>

      {/* ── Sticky footer CTA ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-5 pb-8 pt-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">

        {/* Agreement checkbox */}
        <button
          type="button"
          onClick={() => setAgreed((p) => !p)}
          className="flex items-start gap-2.5 mb-4 text-left w-full"
        >
          <div
            className={cn(
              "w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all",
              agreed
                ? "bg-amber-500 border-amber-500"
                : "border-white/20 bg-transparent"
            )}
          >
            {agreed && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="black"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span className="text-white/40 text-xs leading-relaxed">
            I agree to the loan terms. I understand{" "}
            {naira(offer.monthlyRepayment)} will be auto-debited monthly for{" "}
            {offer.termMonths} months.
          </span>
        </button>

        <Button
          type="button"
          onClick={handleAccept}
          disabled={!agreed}
          className={cn(
            "w-full h-14 text-base font-bold rounded-2xl transition-all duration-200",
            agreed
              ? "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25 active:scale-[0.98]"
              : "bg-white/5 text-white/20 cursor-not-allowed"
          )}
        >
          Accept Loan · {naira(offer.amount)}
          {agreed && <ArrowRight className="w-5 h-5 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
