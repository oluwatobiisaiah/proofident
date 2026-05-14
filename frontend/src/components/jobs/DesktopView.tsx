import { JOBS } from "@/lib/jobs/jobs";
import { useState } from "react";
import JobListItem from "@/components/jobs/JobListItem";
import JobDetail from "@/components/jobs/JobDetail";

function DesktopView() {
  const [activeId, setActiveId] = useState<number>(1);
  const activeJob = JOBS.find((j) => j.id === activeId);

  return (
    <div className="flex h-screen bg-[#F8F7F2] font-['DM_Sans',system-ui,sans-serif]">
      <div className="flex w-[35%] max-w-[320px] flex-col border-r border-[#E8E6DF] bg-white">
        <div className="px-4 pt-6 pb-3">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#B4B2A9]">
            Proofident
          </div>

          <h2 className="mb-4 text-[18px] font-bold text-[#1a1a18]">
            Your Job Matches
          </h2>

          <div className="flex items-center gap-2 rounded-[8px] bg-[#F1EFE8] px-2.5 py-1.5">
            <i className="ti ti-search text-[14px] text-[#888780]" />
            <span className="text-[13px] text-[#888780]">
              Filter jobs...
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {JOBS.map((job) => (
            <JobListItem
              key={job.id}
              job={job}
              active={job.id === activeId}
              onClick={() => setActiveId(job.id)}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5 border-t border-[#E8E6DF] px-4 py-3 text-[12px] text-[#B4B2A9]">
          <i className="ti ti-sparkles text-[13px]" />
          {JOBS.length} matches found for you
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeJob && <JobDetail job={activeJob} />}
      </div>
    </div>
  );
}

export default DesktopView;