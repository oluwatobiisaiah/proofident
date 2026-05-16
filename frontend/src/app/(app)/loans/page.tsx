"use client";

// app/loans/page.tsx
import { useIsMobile } from "@/hooks/useMobile";
import LoansMobileView from "@/components/loans/LoansMobileView";
import LoansDesktopView from "@/components/loans/LoansDesktopView";

export default function Page() {
  const isMobile = useIsMobile(640);
  return (
    <div className=''>
      {isMobile ? <LoansMobileView /> : <LoansDesktopView />}
    </div>
  );
}
