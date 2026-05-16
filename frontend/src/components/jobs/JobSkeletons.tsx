"use client";

// ─── Shared shimmer base ───────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={[
        "animate-pulse rounded-md bg-[#E8E6DF]",
        className,
      ].join(" ")}
    />
  );
}

// ─── JobListItemSkeleton ──────────────────────────────────────────────────────
// Mirrors the layout of JobListItem in the desktop sidebar

export function JobListItemSkeleton() {
  return (
    <div className="mx-1 mb-1 rounded-[10px] px-3 py-3">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Shimmer className="h-9 w-9 flex-shrink-0 rounded-[8px]" />

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Title */}
          <Shimmer className="h-3.5 w-4/5" />
          {/* Employer */}
          <Shimmer className="h-3 w-3/5" />

          <div className="flex items-center gap-2 pt-0.5">
            {/* Match badge */}
            <Shimmer className="h-4 w-10 rounded-full" />
            {/* Location pill */}
            <Shimmer className="h-4 w-20 rounded-full" />
          </div>
        </div>

        {/* Score circle */}
        <Shimmer className="h-8 w-8 flex-shrink-0 rounded-full" />
      </div>
    </div>
  );
}

// ─── SwipeCardSkeleton ────────────────────────────────────────────────────────
// Mirrors the dimensions of a SwipeCard on mobile

export function SwipeCardSkeleton() {
  return (
    <div className="absolute inset-x-4 top-0">
      <div className="relative rounded-[20px] bg-white shadow-lg overflow-hidden">
        {/* Top colour strip */}
        <Shimmer className="h-1.5 w-full rounded-none" />

        <div className="px-5 pt-5 pb-6 space-y-4">
          {/* Header row */}
          <div className="flex items-start gap-3">
            <Shimmer className="h-12 w-12 rounded-[10px]" />
            <div className="flex-1 space-y-2 pt-1">
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/2" />
            </div>
            <Shimmer className="h-10 w-10 rounded-full" />
          </div>

          {/* Pills row */}
          <div className="flex gap-2">
            <Shimmer className="h-6 w-24 rounded-full" />
            <Shimmer className="h-6 w-20 rounded-full" />
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>

          {/* Compensation */}
          <div className="rounded-[12px] bg-[#F8F7F2] p-3 space-y-2">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-5 w-40" />
          </div>

          {/* Why match list */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <Shimmer className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full" />
                <Shimmer className="h-3 flex-1" style={{ width: `${60 + i * 10}%` }} />
              </div>
            ))}
          </div>

          {/* CTA button */}
          <Shimmer className="h-11 w-full rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}

// ─── JobDetailSkeleton ────────────────────────────────────────────────────────
// Mirrors the layout of JobDetail (used in both desktop pane and mobile full-screen)

export function JobDetailSkeleton() {
  return (
    <div className="space-y-0">
      {/* Hero / header block */}
      <div className="border-b border-[#E8E6DF] px-6 py-6">
        <div className="mb-4 flex items-start gap-4">
          <Shimmer className="h-14 w-14 rounded-[12px]" />
          <div className="flex-1 space-y-2 pt-1">
            <Shimmer className="h-5 w-3/5" />
            <Shimmer className="h-3.5 w-2/5" />
          </div>
          <Shimmer className="h-12 w-12 rounded-full" />
        </div>

        {/* Pills */}
        <div className="flex flex-wrap gap-2">
          {[80, 64, 72, 56].map((w, i) => (
            <Shimmer key={i} className={`h-6 rounded-full`} style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>

      {/* Compensation band */}
      <div className="border-b border-[#E8E6DF] px-6 py-4">
        <Shimmer className="mb-2 h-3 w-20" />
        <Shimmer className="h-6 w-48" />
      </div>

      {/* Why match section */}
      <div className="border-b border-[#E8E6DF] px-6 py-4 space-y-3">
        <Shimmer className="h-3.5 w-28" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-2">
            <Shimmer className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full" />
            <Shimmer className="h-3 flex-1" style={{ width: `${55 + i * 8}%` }} />
          </div>
        ))}
      </div>

      {/* Skills section */}
      <div className="border-b border-[#E8E6DF] px-6 py-4 space-y-3">
        <Shimmer className="h-3.5 w-24" />
        <div className="flex flex-wrap gap-2">
          {[90, 70, 110, 80].map((w, i) => (
            <Shimmer key={i} className="h-7 rounded-full" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>

      {/* Equipment section */}
      <div className="border-b border-[#E8E6DF] px-6 py-4 space-y-3">
        <Shimmer className="h-3.5 w-28" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Shimmer className="h-4 w-4 flex-shrink-0 rounded-sm" />
            <Shimmer className="h-3" style={{ width: `${120 + i * 20}px` }} />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 py-5">
        <Shimmer className="h-12 w-full rounded-[12px]" />
      </div>
    </div>
  );
}
