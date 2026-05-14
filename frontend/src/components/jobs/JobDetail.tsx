import { formatNaira } from "@/lib/jobs/utils";
import { JobDetailProps } from "./types";
import MatchBadge from "./MatchBadge";
import Pill from "./Pill";
import Section from "./Section";

function JobDetail({ job, onBack }: JobDetailProps) {
  const monthlyLow = formatNaira(job.compensationMin);
  const monthlyHigh = formatNaira(job.compensationMax);

  return (
    <div className="mx-auto max-w-170 px-10 py-9 font-['DM_Sans','Outfit',system-ui,sans-serif]">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-7 flex items-center gap-1.5 p-0 text-[13px] text-[#888780]"
        >
          <i className="ti ti-arrow-left text-[16px]" />
          Back to jobs
        </button>
      )}

      <div className="mb-6 flex items-start gap-4">
        <div
          className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[14px] text-[15px] font-bold"
          style={{
            background: job.employerBg,
            color: job.employerColor,
          }}
        >
          {job.employerInitials}
        </div>

        <div className="flex-1">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888780]">
            {job.category}
          </div>

          <h1 className="mb-1 text-[22px] font-bold leading-[1.2] text-[#1a1a18]">
            {job.title}
          </h1>

          <div className="text-[14px] text-[#5F5E5A]">
            {job.employer}
          </div>
        </div>

        <MatchBadge score={job.matchScore} />
      </div>

      <div className="mb-7 flex flex-wrap gap-2.5 border-b border-[#eeece6] pb-7">
        <Pill icon="ti-map-pin" text={job.location} />

        <Pill
          icon={job.arrangementIcon}
          text={job.arrangement}
          accent
        />

        <Pill
          icon="ti-currency-naira"
          text={`${monthlyLow}–${monthlyHigh}/mo`}
          highlight
        />
      </div>

      <Section title="Job Description">
        <p className="m-0 text-[14px] leading-[1.75] text-[#444441]">
          {job.description}
        </p>
      </Section>

      <Section title="Required Skills">
        <div className="flex flex-wrap gap-2">
          {job.skills.map((s) => (
            <span
              key={s}
              className="rounded-full bg-[#F1EFE8] px-3 py-1.25 text-[12px] font-medium text-[#444441]"
            >
              {s}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Equipment Needed">
        <ul className="m-0 list-none p-0">
          {job.equipment.map((e) => (
            <li
              key={e}
              className="mb-1.5 flex items-center gap-2 text-[14px] text-[#5F5E5A]"
            >
              <i className="ti ti-point-filled text-[8px] text-[#B4B2A9]" />
              {e}
            </li>
          ))}
        </ul>
      </Section>

      <div
        className="mb-6 flex items-center justify-between gap-3 rounded-[14px] px-5.5 py-4.5"
        style={{
          background:
            job.startupCost > 0 ? "#E1F5EE" : "#F1EFE8",
        }}
      >
        <div>
          <div
            className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{
              color:
                job.startupCost > 0
                  ? "#0F6E56"
                  : "#888780",
            }}
          >
            Startup Cost / Get Started
          </div>

          <div
            className="text-[22px] font-bold"
            style={{
              color:
                job.startupCost > 0
                  ? "#085041"
                  : "#5F5E5A",
            }}
          >
            {job.startupCost === 0
              ? "Free to start"
              : formatNaira(job.startupCost)}
          </div>
        </div>

        {job.loanAvailable && (
          <div className="flex items-center rounded-[10px] bg-[#085041] px-4 py-2 text-center text-[12px] font-semibold leading-[1.4] text-[#E1F5EE]">
            <i className="ti ti-check mr-1 text-[14px]" />
            Loan available
          </div>
        )}
      </div>

      <Section title="Why you match">
        <ul className="m-0 list-none p-0">
          {job.whyMatch.map((w) => (
            <li
              key={w}
              className="mb-2 flex items-center gap-2.5 text-[14px] text-[#5F5E5A]"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E1F5EE]">
                <i className="ti ti-check text-[11px] text-[#1D9E75]" />
              </span>
              {w}
            </li>
          ))}
        </ul>
      </Section>

      <button className="mt-2 w-full rounded-[12px] bg-[#1a1a18] py-4 text-[15px] font-semibold tracking-[0.01em] text-white">
        I'm Interested →
      </button>
    </div>
  );
}

export default JobDetail;