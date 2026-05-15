import { MatchBadgeProps } from "./types";

function MatchBadge({ score }: MatchBadgeProps) {
  const color =
    score >= 85
      ? "text-[#1D9E75]"
      : score >= 75
        ? "text-[#BA7517]"
        : score >= 65
          ? "text-[#534AB7]"
          : "text-[#888780]";

  const bg =
    score >= 85
      ? "bg-[#E1F5EE]"
      : score >= 75
        ? "bg-[#FAEEDA]"
        : score >= 65
          ? "bg-[#EEEDFE]"
          : "bg-[#F1EFE8]";

  return (
    <span
      className={`rounded-full px-2.25 py-0.75 text-[12px] font-semibold tracking-[0.02em] ${bg} ${color}`}
    >
      {score}% match
    </span>
  );
}

export default MatchBadge;
