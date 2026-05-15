"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function WelcomeScreen() {
  return (
    <div className='flex flex-col px-6'>
      <header className="pt-10 pb-4 text-center">
        <span
          className="text-xl font-black tracking-tight text-black inline-flex gap-px"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          <span className="">Proof</span><span className="text-black/40">ident</span>
        </span>
      </header>
      {/* Main content — pushes CTA to bottom */}
      <main className='flex-1 flex flex-col justify-center gap-8'>
        {/* Badge */}
        {/* <span className='inline-flex w-fit items-center gap-1.5 bg-black/10 border border-black/20 text-black text-xs font-semibold px-3 py-1.5 rounded-full'>
          🇳🇬 Built for Nigeria
        </span> */}

        {/* Headline + sub */}
        <div className='space-y-4 text-center'>
          <h1
            className='text-3xl font-extrabold text-black leading-[1.1] tracking-tight '
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Get a credit score & job matches in 5 minutes.
          </h1>
          <p className='text-black/90 text-base leading-relaxed'>
            No paperwork. Just connect your accounts.
          </p>
        </div>
      </main>
    </div>
  );
}
