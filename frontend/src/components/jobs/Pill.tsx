import { PillProps } from "@/components/jobs/types";

function Pill({ icon, text, accent, highlight }: PillProps) {
  const bg = highlight
    ? "bg-[#1a1a18]"
    : accent
      ? "bg-[#EEEDFE]"
      : "bg-[#F1EFE8]";

  const color = highlight
    ? "text-white"
    : accent
      ? "text-[#534AB7]"
      : "text-[#5F5E5A]";

  return (
    <span
      className={`inline-flex items-center gap-1.25 rounded-full px-3 py-1.25 text-[12px] font-medium ${bg} ${color}`}
    >
      <i className={`ti ${icon} text-[13px]`} />
      {text}
    </span>
  );
}

export default Pill;
