"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  FileText,
  ShieldCheck,
  Info,
  Smartphone,
  DollarSign,
  UserCheck,
  Dices,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { useSession } from "next-auth/react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TransferableTrait {
  key: string;
  label: string;
  score: number;
  reason: string;
}

interface Factor {
  text: string;
}

interface ImprovementSuggestion {
  text: string;
}

interface CreditScore {
  id: string;
  userId: string;
  score: number;
  scoreRange: string;
  confidence: string;
  confidenceLevel: string;
  completenessTier: string;
  inferredOccupation: string;
  occupationConfidence: string;
  transferableTraits: TransferableTrait[];
  supportingSignals: string[];
  dataSourcesUsed: string[];
  positiveFactors: Factor[];
  negativeFactors: Factor[];
  improvementSuggestions: ImprovementSuggestion[];
  recommendedLoanLimit: number;
  generatedAt: string;
  expiresAt: string;
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCORE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; ring: string; gradient: string }
> = {
  excellent: {
    label: "Excellent",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "stroke-emerald-500",
    gradient: "from-emerald-400 to-teal-500",
  },
  good: {
    label: "Good",
    color: "text-sky-600",
    bg: "bg-sky-50",
    ring: "stroke-sky-500",
    gradient: "from-sky-400 to-blue-500",
  },
  fair: {
    label: "Fair",
    color: "text-amber-600",
    bg: "bg-amber-50",
    ring: "stroke-amber-500",
    gradient: "from-amber-400 to-orange-500",
  },
  subprime: {
    label: "Subprime",
    color: "text-orange-600",
    bg: "bg-orange-50",
    ring: "stroke-orange-500",
    gradient: "from-orange-400 to-red-400",
  },
  poor: {
    label: "Poor",
    color: "text-red-600",
    bg: "bg-red-50",
    ring: "stroke-red-500",
    gradient: "from-red-400 to-rose-500",
  },
};

const DATA_SOURCE_META: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  betting: { label: "Betting", icon: Dices },
  mobile_money: { label: "Mobile Money", icon: Smartphone },
  self_declared: { label: "Self Declared", icon: UserCheck },
  bank: { label: "Bank", icon: DollarSign },
};

const OCCUPATION_META: Record<string, string> = {
  gig_worker: "Gig Worker",
  salaried: "Salaried",
  self_employed: "Self-Employed",
  student: "Student",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Gauge ───────────────────────────────────────────────────────────────────

function ScoreGauge({
  score,
  scoreRange,
}: {
  score: number;
  scoreRange: string;
}) {
  const config = SCORE_CONFIG[scoreRange] ?? SCORE_CONFIG.fair;

  const MIN = 300;
  const MAX = 850;
  const pct = Math.min(1, Math.max(0, (score - MIN) / (MAX - MIN)));

  const cx = 100;
  const cy = 100;
  const r = 76;
  const startAngle = -210;
  const sweepAngle = 240;

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function arcPath(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  const endAngle = startAngle + sweepAngle * pct;
  const trackId = `gauge-gradient-${scoreRange}`;

  return (
    <div className='flex flex-col items-center gap-1'>
      <svg viewBox='0 0 200 130' className='w-56 h-36 -mb-2'>
        <defs>
          <linearGradient id={trackId} x1='0%' y1='0%' x2='100%' y2='0%'>
            <stop offset='0%' stopColor='var(--gauge-start)' />
            <stop offset='100%' stopColor='var(--gauge-end)' />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={arcPath(startAngle, startAngle + sweepAngle)}
          fill='none'
          stroke='currentColor'
          strokeWidth='10'
          strokeLinecap='round'
          className='text-muted/30'
        />

        {/* Progress */}
        {pct > 0 && (
          <path
            d={arcPath(startAngle, endAngle)}
            fill='none'
            strokeWidth='10'
            strokeLinecap='round'
            className={`${config.ring} transition-all duration-700`}
            style={
              {
                stroke: `url(#${trackId})`,
                "--gauge-start":
                  scoreRange === "subprime"
                    ? "#fb923c"
                    : scoreRange === "fair"
                      ? "#fbbf24"
                      : scoreRange === "good"
                        ? "#38bdf8"
                        : "#34d399",
                "--gauge-end":
                  scoreRange === "subprime"
                    ? "#f87171"
                    : scoreRange === "fair"
                      ? "#f97316"
                      : scoreRange === "good"
                        ? "#3b82f6"
                        : "#059669",
              } as React.CSSProperties
            }
          />
        )}

        {/* Score text */}
        <text
          x={cx}
          y={cy + 4}
          textAnchor='middle'
          className='fill-foreground font-black'
          style={{ fontSize: 34, fontFamily: "inherit" }}
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 22}
          textAnchor='middle'
          className={`${config.color} font-semibold`}
          style={{ fontSize: 13, fontFamily: "inherit" }}
        >
          {config.label}
        </text>
      </svg>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function CreditScoreSkeleton() {
  return (
    <div className='w-full max-w-xl mx-auto space-y-4 p-4'>
      {/* Header */}
      <div className='text-center space-y-2 pt-2'>
        <Skeleton className='h-4 w-32 mx-auto' />
        <Skeleton className='h-3 w-48 mx-auto' />
      </div>

      {/* Gauge */}
      <Card className='border-0 shadow-sm'>
        <CardContent className='flex flex-col items-center pt-6 pb-4 gap-4'>
          <Skeleton className='h-36 w-56 rounded-full' />
          <div className='flex gap-2'>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className='h-6 w-20 rounded-full' />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Traits */}
      <Card className='border-0 shadow-sm'>
        <CardContent className='pt-4 pb-3 space-y-3'>
          <Skeleton className='h-3 w-24' />
          {[1, 2].map((i) => (
            <div key={i} className='space-y-1'>
              <div className='flex justify-between'>
                <Skeleton className='h-3 w-20' />
                <Skeleton className='h-3 w-10' />
              </div>
              <Skeleton className='h-2 w-full rounded-full' />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Positive factors */}
      <Card className='border-0 shadow-sm'>
        <CardContent className='pt-4 pb-3 space-y-2'>
          <Skeleton className='h-3 w-36' />
          {[1, 2, 3].map((i) => (
            <div key={i} className='flex gap-2 items-start'>
              <Skeleton className='h-4 w-4 rounded-full shrink-0 mt-0.5' />
              <Skeleton className='h-3 w-full' />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Improvements */}
      <Card className='border-0 shadow-sm'>
        <CardContent className='pt-4 pb-3 space-y-2'>
          <Skeleton className='h-3 w-28' />
          {[1, 2].map((i) => (
            <div key={i} className='flex gap-2 items-start'>
              <Skeleton className='h-4 w-4 shrink-0 mt-0.5' />
              <Skeleton className='h-3 w-full' />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className='flex gap-3'>
        <Skeleton className='h-10 flex-1 rounded-md' />
        <Skeleton className='h-10 flex-1 rounded-md' />
      </div>
    </div>
  );
}

// ─── Trait Bar ────────────────────────────────────────────────────────────────

function TraitBar({ trait }: { trait: TransferableTrait }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='space-y-1 cursor-default'>
            <div className='flex items-center justify-between text-xs'>
              <span className='font-medium text-foreground'>{trait.label}</span>
              <span className='tabular-nums text-muted-foreground font-semibold'>
                {trait.score}/100
              </span>
            </div>
            <div className='h-1.5 w-full bg-muted rounded-full overflow-hidden'>
              <div
                className='h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700'
                style={{ width: `${trait.score}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side='top'
          className='max-w-[220px] text-xs leading-relaxed'
        >
          {trait.reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreditScorePage() {
  const { data: session } = useSession();

  async function fetchCreditScore(): Promise<CreditScore> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/score`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session?.accessToken!}`,
      },
    });
    console.log("failed");
    if (!res.ok) throw new Error("Failed to fetch credit score");

    const json = await res.json();
    console.log("API response:", JSON.stringify(json, null, 2)); // 👈 check the actual shape

    const score = json.score ?? json.data ?? json;
    if (!score) throw new Error("Score data missing from response");

    return score;
  }
  const { data, isLoading, isError, refetch } = useQuery<CreditScore>({
    queryKey: ["creditScore"],
    queryFn: fetchCreditScore,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  if (isLoading) return <CreditScoreSkeleton />;

  if (isError || !data) {
    return (
      <div className='w-full max-w-xl mx-auto flex flex-col items-center gap-4 py-16 text-center'>
        <ShieldCheck className='w-10 h-10 text-muted-foreground' />
        <p className='text-sm text-muted-foreground'>
          Unable to load your credit score. Please try again.
        </p>
        <Button variant='outline' size='sm' onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const config = SCORE_CONFIG[data.scoreRange] ?? SCORE_CONFIG.fair;
  const expiresAt = new Date(data.expiresAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className='w-full max-w-xl mx-auto space-y-3 px-4 py-5 font-sans'>
      {/* ── Header ── */}
      <div className='text-center space-y-0.5 pb-1'>
        <h1 className='text-base font-bold tracking-tight text-foreground'>
          Credit Score
        </h1>
        <p className='text-xs text-muted-foreground'>
          Your financial reliability score
        </p>
      </div>

      {/* ── Score Card ── */}
      <Card className='border shadow-sm overflow-hidden'>
        <div className={`h-1 w-full bg-gradient-to-r ${config.gradient}`} />
        <CardContent className='flex flex-col items-center pt-5 pb-4 gap-3'>
          <ScoreGauge score={data.score} scoreRange={data.scoreRange} />

          {/* Meta badges */}
          <div className='flex flex-wrap justify-center gap-2'>
            {/* Data sources */}
            {data.dataSourcesUsed.map((src) => {
              const meta = DATA_SOURCE_META[src];
              const Icon = meta?.icon ?? Info;
              return (
                <Badge
                  key={src}
                  variant='secondary'
                  className='text-xs gap-1 font-normal'
                >
                  <Icon className='w-3 h-3' />
                  {meta?.label ?? src}
                </Badge>
              );
            })}
          </div>

          <Separator className='w-full' />

          {/* Occupation + Confidence row */}
          <div className='w-full grid grid-cols-2 gap-3 text-center'>
            <div className='space-y-0.5'>
              <p className='text-[10px] uppercase tracking-widest text-muted-foreground font-medium'>
                Occupation
              </p>
              <div className='flex items-center justify-center gap-1'>
                <Briefcase className='w-3.5 h-3.5 text-muted-foreground' />
                <span className='text-sm font-semibold'>
                  {OCCUPATION_META[data.inferredOccupation] ??
                    data.inferredOccupation}
                </span>
              </div>
              <p className='text-[10px] text-muted-foreground'>
                {Math.round(parseFloat(data.occupationConfidence) * 100)}%
                confidence
              </p>
            </div>
            <div className='space-y-0.5'>
              <p className='text-[10px] uppercase tracking-widest text-muted-foreground font-medium'>
                Loan Limit
              </p>
              <p className='text-sm font-semibold text-foreground'>
                {formatCurrency(data.recommendedLoanLimit)}
              </p>
              <p className='text-[10px] text-muted-foreground'>
                Recommended max
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Transferable Traits ── */}
      {data.transferableTraits.length > 0 && (
        <Card className='border shadow-sm'>
          <CardContent className='pt-4 pb-4 space-y-3'>
            <div className='flex items-center gap-1.5'>
              <ShieldCheck className='w-3.5 h-3.5 text-muted-foreground' />
              <p className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
                Transferable Traits
              </p>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className='w-3 h-3 text-muted-foreground/60 cursor-help ml-auto' />
                  </TooltipTrigger>
                  <TooltipContent side='top' className='text-xs max-w-[200px]'>
                    Behavioural traits inferred from your activity that map to
                    financial reliability.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {data.transferableTraits.map((t) => (
              <TraitBar key={t.key} trait={t} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── What Helped Your Score ── */}
      {data.positiveFactors.length > 0 && (
        <Card className='border shadow-sm'>
          <CardContent className='pt-4 pb-4 space-y-2.5'>
            <div className='flex items-center gap-1.5'>
              <TrendingUp className='w-3.5 h-3.5 text-emerald-500' />
              <p className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
                What helped your score
              </p>
            </div>
            <ul className='space-y-2'>
              {data.positiveFactors.map((f, i) => (
                <li key={i} className='flex items-start gap-2'>
                  <span className='mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0' />
                  <p className='text-sm text-foreground/80 leading-snug'>
                    {f.text}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── What Hurt Your Score ── */}
      {data.negativeFactors.length > 0 && (
        <Card className='border shadow-sm'>
          <CardContent className='pt-4 pb-4 space-y-2.5'>
            <div className='flex items-center gap-1.5'>
              <TrendingDown className='w-3.5 h-3.5 text-red-500' />
              <p className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
                What hurt your score
              </p>
            </div>
            <ul className='space-y-2'>
              {data.negativeFactors.map((f, i) => (
                <li key={i} className='flex items-start gap-2'>
                  <span className='mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0' />
                  <p className='text-sm text-foreground/80 leading-snug'>
                    {f.text}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── How to Improve ── */}
      {data.improvementSuggestions.length > 0 && (
        <Card className='border shadow-sm bg-amber-50/50 dark:bg-amber-950/10'>
          <CardContent className='pt-4 pb-4 space-y-2.5'>
            <div className='flex items-center gap-1.5'>
              <Lightbulb className='w-3.5 h-3.5 text-amber-500' />
              <p className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
                How to improve
              </p>
            </div>
            <ul className='space-y-2'>
              {data.improvementSuggestions.map((s, i) => (
                <li key={i} className='flex items-start gap-2'>
                  <ChevronRight className='w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5' />
                  <p className='text-sm text-foreground/80 leading-snug'>
                    {s.text}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── CTAs ── */}
      <div className='flex gap-3 pt-1'>
        <Button className='flex-1 gap-2' size='default'>
          <TrendingUp className='w-4 h-4' />
          Improve Score
        </Button>
        <Button variant='outline' className='flex-1 gap-2' size='default'>
          <FileText className='w-4 h-4' />
          View Full Report
        </Button>
      </div>

      {/* ── Expiry note ── */}
      <p className='text-center text-[10px] text-muted-foreground pb-2'>
        Score valid until {expiresAt} · {data.confidenceLevel} confidence (
        {Math.round(parseFloat(data.confidence) * 100)}%)
      </p>
    </div>
  );
}
