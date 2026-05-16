"use client";

import { useState } from "react";
import { useJobMatches } from "@/lib/jobs/useJobMatches";
import { Job } from "@/components/jobs/types";
import JobListItem from "@/components/jobs/JobListItem";
import JobDetail from "@/components/jobs/JobDetail";
import {
  JobListItemSkeleton,
  JobDetailSkeleton,
} from "@/components/jobs/JobSkeletons";

// How many sidebar skeleton rows to show while loading
const SIDEBAR_SKELETON_COUNT = 6;

/**
 * DesktopView
 *
 * @param token  Pass the user's access token from your auth provider.
 *               Example with next-auth:
 *                 const { data: session } = useSession();
 *                 <DesktopView token={session?.accessToken} />
 */
function DesktopView({ token }: { token: string | undefined }) {
  const { data: jobs, isLoading, error } = useJobMatches(token);
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F7F2] font-['DM_Sans',system-ui,sans-serif] text-[14px] text-[#888780]">
        <div className='text-center space-y-2'>
          <i className='ti ti-wifi-off text-[32px] text-[#B4B2A9]' />
          <p>Failed to load matches. Please try again.</p>
        </div>
      </div>
    );
  }

  const resolvedActiveId = activeId ?? jobs?.[0]?.id ?? null;
  const activeJob: Job | undefined = jobs?.find(
    (j) => j.id === resolvedActiveId,
  );

  return (
    <div className="flex h-screen bg-[#F8F7F2] font-['DM_Sans',system-ui,sans-serif]">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className='flex w-[35%] max-w-[320px] flex-col border-r border-[#E8E6DF] bg-white'>
        {/* Header */}
        <div className='px-4 pt-6 pb-3'>
          <div className='mb-1 text-[11px] font-bold uppercase tracking-widest text-[#B4B2A9]'>
            Proofident
          </div>

          <h2 className='mb-4 text-[18px] font-bold text-[#1a1a18]'>
            Your Job Matches
          </h2>
        </div>

        {/* List */}
        <div className='flex-1 overflow-y-auto px-2 pb-4'>
          {!jobs
            ? Array.from({ length: SIDEBAR_SKELETON_COUNT }).map((_, i) => (
                <JobListItemSkeleton key={i} />
                
              ))
            : jobs!.map((job) => (
                <JobListItem
                  key={job.id}
                  job={job}
                  active={job.id === resolvedActiveId}
                  onClick={() => setActiveId(job.id)}
                />
              ))}
        </div>

        {/* Footer */}
        <div className='flex items-center gap-1.5 border-t border-[#E8E6DF] px-4 py-3 text-[12px] text-[#B4B2A9]'>
          <i className='ti ti-sparkles text-[13px]' />
          {!jobs ? (
            <div className='h-3 w-28 animate-pulse rounded bg-[#E8E6DF]' />
          ) : (
            `${jobs!.length} matches found for you`
          )}
        </div>
      </div>

      {/* ── Detail pane ─────────────────────────────────────────────────────── */}
      <div className='flex-1 overflow-y-auto'>
        {isLoading ? (
          <JobDetailSkeleton />
        ) : (
          activeJob && <JobDetail job={activeJob} />
        )}
      </div>
    </div>
  );
}

export default DesktopView;
