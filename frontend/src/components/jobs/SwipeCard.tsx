"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  PanInfo,
} from "motion/react";

import { CardColor, SwipeCardProps } from "@/components/jobs/types";
import { formatNaira } from "@/lib/jobs/utils";

const CARD_COLORS: CardColor[] = [
  { from: "#0F6E56", to: "#085041" },
  { from: "#534AB7", to: "#3C3489" },
  { from: "#BA7517", to: "#854F0B" },
  { from: "#185FA5", to: "#0C447C" },
  { from: "#444441", to: "#2C2C2A" },
];

function SwipeCard({ job, index, isTop, colorIndex, onSwiped, onViewDetail }: SwipeCardProps) {
  const x = useMotionValue(0);

  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);

  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const cardRef = useRef(null);

  const col = CARD_COLORS[colorIndex % CARD_COLORS.length];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 100;

    if (Math.abs(info.offset.x) > threshold) {
      const dir = info.offset.x > 0 ? 1 : -1;

      animate(x, dir * 500, {
        type: "spring",
        stiffness: 300,
        damping: 30,
        onComplete: () => {
          onSwiped();
          x.set(0);
        },
      });
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className='absolute left-4 w-[calc(100%-32px)] select-none'
      style={{
        top: 0,
        zIndex: 10 - index,
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        scale: 1,
        cursor: isTop ? "grab" : "default",
        transformOrigin: "bottom center",
      }}
      drag={isTop ? "x" : false}
      dragElastic={0.3}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileTap={isTop ? { cursor: "grabbing" } : {}}
    >
      <div
        className='relative flex min-h-110 flex-col overflow-hidden rounded-[24px]'
        style={{
          background: `linear-gradient(145deg, ${col.from}, ${col.to})`,
        }}
      >
        <div className='px-6 pt-7'>
          <div className='mb-6 flex items-start justify-between'>
            <div>
              <div className='mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55'>
                {job.category}
              </div>

              <h2 className='m-0 text-[22px] font-extrabold leading-[1.2] text-white'>
                {job.title}
              </h2>

              <div className='mt-1 text-[13px] text-white/65'>
                {job.employer}
              </div>
            </div>

            <div className='ml-3 shrink-0 rounded-[10px] bg-white/15 px-3 py-1.5 text-[15px] font-extrabold text-white'>
              {job.matchScore}%
            </div>
          </div>

          <div className='mb-5 flex flex-wrap gap-2'>
            <span className='flex items-center gap-1.25 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/0.9'>
              <i className='ti ti-map-pin text-[11px]' />
              {job.location}
            </span>

            <span className='flex items-center gap-1.25 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/0.9'>
              <i className={`ti ${job.arrangementIcon} text-[11px]`} />
              {job.arrangement}
            </span>
          </div>

          <div className='mb-5 flex items-center justify-between rounded-[14px] bg-black/25 px-4 py-3.5'>
            <div>
              <div className='mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] bg-white/15'>
                Monthly Earnings
              </div>

              <div className='text-[18px] font-extrabold text-white'>
                {formatNaira(job.compensationMin)} –{" "}
                {formatNaira(job.compensationMax)}
              </div>
            </div>

            {job.loanAvailable && (
              <div className='rounded-[8px] bg-[rgba(255,255,255,0.2)] px-2.5 py-1.5 text-center text-[10px] font-bold uppercase leading-[1.4] tracking-[0.06em] text-white'>
                <i className='ti ti-check mx-auto mb-0.5 block text-[12px]' />
                Loan ready
              </div>
            )}
          </div>

          <div className='mb-5'>
            <div className='mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgba(255,255,255,0.5)]'>
              Why you match
            </div>

            {job.whyMatch.slice(0, 2).map((w) => (
              <div
                key={w}
                className='mb-1.25 flex items-center gap-2 text-[12px] text-white/0.8'
              >
                <i className='ti ti-check text-[12px] text-white/0.5' />
                {w}
              </div>
            ))}
          </div>
        </div>

        <div
          className='mt-auto px-6 pb-7'
          style={{
            background: "linear-gradient(transparent, rgba(0,0,0,0.35))",
          }}
        >
          {isTop && (
            <button
              onClick={onViewDetail}
              onPointerDown={(e) => e.stopPropagation()}
              className='w-full rounded-[14px] bg-white py-3.75 text-[14px] font-bold tracking-[0.01em]'
              style={{
                color: col.to,
              }}
            >
              View Full Details →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default SwipeCard;
