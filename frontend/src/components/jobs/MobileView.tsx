import { JOBS } from "@/lib/jobs/jobs";
import { useState } from "react";
import JobDetail from "./JobDetail";
import { Job } from "@/components/jobs/types";
import SwipeCard from "./SwipeCard";

function MobileView() {
  const [jobs, setJobs] = useState([...JOBS]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const handleSwiped = () => {
    setJobs((prev) => {
      const [top, ...rest] = prev;
      return [...rest, top]; // move top card to the bottom
    });
  };

  const JOB_COLOR_INDICES = Object.fromEntries(
    JOBS.map((job, i) => [job.id, i]),
  );
  if (selectedJob) {
    return (
      <div className="min-h-screen overflow-y-auto bg-[#F8F7F2] font-['DM_Sans',system-ui,sans-serif]">
        <JobDetail job={selectedJob} onBack={() => setSelectedJob(null)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F2] font-['DM_Sans',system-ui,sans-serif]">
      <div className='px-5 pt-7'>
        <div className='mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B4B2A9]'>
          Proofident
        </div>

        <h1 className='mb-1 text-[22px] font-extrabold text-[#1a1a18]'>
          Your Matches
        </h1>

        <p className='mb-8 text-[13px] text-[#888780]'>
          Swipe to explore · tap to see full details
        </p>
      </div>

      <div className='relative mb-30 min-h-120 flex-1'>
        {[...jobs].reverse().map((job, revIdx) => {
          const index = jobs.length - 1 - revIdx;
          const isTop = index === 0;
          return (
            <SwipeCard
              key={job.id}
              job={job}
              index={index}
              isTop={isTop}
              colorIndex={JOB_COLOR_INDICES[job.id]}
              onSwiped={handleSwiped}
              onViewDetail={() => setSelectedJob(job)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default MobileView;
