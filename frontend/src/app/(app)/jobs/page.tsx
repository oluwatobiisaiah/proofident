"use client";

import { useSession } from "next-auth/react";
import { useIsMobile } from "@/hooks/useMobile";
import DesktopView from "@/components/jobs/DesktopView";
import MobileView from "@/components/jobs/MobileView";

export default function Page() {
  const isMobile = useIsMobile(640)
  const { data: session } = useSession();

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
      />
      {isMobile ? <MobileView token={session?.accessToken} /> : <DesktopView token={session?.accessToken} /> }
    </div>
  );
}
