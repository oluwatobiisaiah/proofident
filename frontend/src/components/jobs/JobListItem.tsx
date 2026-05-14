import { Job } from "./types";

interface JobListItemProps {
  job: Job;
  active: boolean;
  onClick: () => void;
}

function JobListItem({
  job,
  active,
  onClick,
}: JobListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-[12px] px-4 py-3.5 text-left transition-colors duration-150 ${
        active
          ? "bg-[#1a1a18]"
          : "bg-transparent"
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between">
        <div
          className={`text-[14px] font-semibold leading-[1.3] ${
            active ? "text-white" : "text-[#1a1a18]"
          }`}
        >
          {job.title}
        </div>

        <span
          className={`ml-2 shrink-0 text-[11px] font-bold ${
            active
              ? "text-[#9FE1CB]"
              : job.matchScore >= 85
              ? "text-[#1D9E75]"
              : job.matchScore >= 75
              ? "text-[#BA7517]"
              : "text-[#888780]"
          }`}
        >
          {job.matchScore}%
        </span>
      </div>

      <div
        className={`mb-1 text-[12px] ${
          active
            ? "text-[#9FE1CB]"
            : "text-[#888780]"
        }`}
      >
        {job.employer}
      </div>

      <div className="flex items-center gap-1 text-[11px] text-[#B4B2A9]">
        <i className="ti ti-map-pin text-[11px]" />
        {job.location}
      </div>
    </button>
  );
}

export default JobListItem;