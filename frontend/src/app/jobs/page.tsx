"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import DesktopView from "@/components/jobs/DesktopView";
import MobileView from "@/components/jobs/MobileView";

export default function Page() {
  const isMobile = useIsMobile(640)

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
      />
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      {isMobile ? <MobileView /> : <DesktopView /> }
    </div>
  );
}
