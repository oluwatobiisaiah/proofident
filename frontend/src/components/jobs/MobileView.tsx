"use client";

import { useState } from "react";
import { useJobMatches } from "@/lib/jobs/useJobMatches";
import { Job } from "@/components/jobs/types";
import JobDetail from "./JobDetail";
import SwipeCard from "./SwipeCard";
import { SwipeCardSkeleton } from "@/components/jobs/JobSkeletons";

const SLOT_ROTATIONS = [-4, 3, -2, 5, -1];

/**
 * MobileView
 *
 * @param token  Pass the user's access token from your auth provider.
 *               Example with next-auth:
 *                 const { data: session } = useSession();
 *                 <MobileView token={session?.accessToken} />
 */
function MobileView({ token }: { token: string | undefined }) {
  const { data: initialJobs, isLoading, error } = useJobMatches(token);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Initialise local jobs state once data arrives (preserves swipe order locally)
  const resolvedJobs = jobs ?? initialJobs ?? [];
  if (!jobs && initialJobs) {
    setJobs([...initialJobs]);
  }

  const JOB_COLOR_INDICES = Object.fromEntries(
    resolvedJobs.map((job, i) => [job.id, i]),
  );

  const JOB_ROTATIONS = Object.fromEntries(
    resolvedJobs.map((job, i) => [job.id, SLOT_ROTATIONS[i % SLOT_ROTATIONS.length]]),
  );

  const handleSwiped = () => {
    setJobs((prev) => {
      if (!prev || prev.length === 0) return prev;
      const [top, ...rest] = prev;
      return [...rest, top];
    });
  };

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8F7F2] font-['DM_Sans',system-ui,sans-serif] text-[14px] text-[#888780]">
        <i className="ti ti-wifi-off text-[32px] text-[#B4B2A9]" />
        <p>Failed to load matches. Please try again.</p>
      </div>
    );
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedJob) {
    return (
      <div className="min-h-screen overflow-y-auto bg-[#F8F7F2] font-['DM_Sans',system-ui,sans-serif]">
        <JobDetail job={selectedJob} onBack={() => setSelectedJob(null)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F2] font-['DM_Sans',system-ui,sans-serif]">
      {/* Header */}
      <div className="px-5 pt-7">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B4B2A9]">
          Proofident
        </div>

        <h1 className="mb-1 text-[22px] font-extrabold text-[#1a1a18]">
          Your Matches
        </h1>

        <p className="mb-8 text-[13px] text-[#888780]">
          {isLoading ? "Finding your best matches…" : "Swipe to explore · tap to see full details"}
        </p>
      </div>

      {/* Card stack */}
      <div className="relative mb-30 min-h-120 flex-1">
        {isLoading ? (
          // Three stacked skeleton cards to mimic real card-stack depth
          <>
            <div
              className="absolute inset-x-4 top-0 origin-bottom"
              style={{ transform: "translateY(12px) rotate(5deg)", opacity: 0.4 }}
            >
              <div className="rounded-[20px] bg-white shadow-md h-64" />
            </div>
            <div
              className="absolute inset-x-4 top-0 origin-bottom"
              style={{ transform: "translateY(6px) rotate(-2deg)", opacity: 0.65 }}
            >
              <div className="rounded-[20px] bg-white shadow-md h-64" />
            </div>
            <SwipeCardSkeleton />
          </>
        ) : (
          resolvedJobs
            .slice(0, 3)
            .reverse()
            .map((job, revIdx) => {
              const visibleCount = Math.min(resolvedJobs.length, 3);
              const index = visibleCount - 1 - revIdx;
              const isTop = index === 0;
              return (
                <SwipeCard
                  key={job.id}
                  job={job}
                  index={index}
                  isTop={isTop}
                  colorIndex={JOB_COLOR_INDICES[job.id]}
                  cardRotation={JOB_ROTATIONS[job.id]}
                  onSwiped={handleSwiped}
                  onViewDetail={() => setSelectedJob(job)}
                />
              );
            })
        )}
      </div>
    </div>
  );
}

export default MobileView;
