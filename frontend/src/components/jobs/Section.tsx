import { SectionProps } from "@/components/jobs/types";

function Section({
  title,
  children,
}: SectionProps) {
  return (
    <div className="mb-7">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#B4B2A9]">
        {title}
      </h3>

      {children}
    </div>
  );
}

export default Section;