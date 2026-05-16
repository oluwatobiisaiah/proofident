"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/nav-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Convert pathname into readable title
  const title =
    pathname === "/dashboard"
      ? "Dashboard"
      : pathname
          .split("/")
          .filter(Boolean)
          .pop()
          ?.replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className='flex flex-col min-w-0 bg-white text-black'>
        <header className='flex h-15 shrink-0 items-center gap-2 border-b border-black/10 px-4 sm:hidden'>
          {/* Mobile hamburger — opens Sheet with nav links */}
          <MobileNav />

          {/* Collapses the second sidebar on desktop via setOpen from useSidebar */}
          <SidebarTrigger className='hidden md:flex text-black hover:bg-black/5 -ml-1 rounded-md p-1.5 transition-colors' />

          <Separator
            orientation='vertical'
            className='hidden md:block mr-2 data-[orientation=vertical]:h-4 bg-black/10'
          />

          <div className='flex-1'>
            <p className='font-ptserif font-semibold text-xl text-black'>
              {title}
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-full bg-black/10 flex items-center justify-center'>
              <span className='font-inter text-xs font-medium text-black/70'>
                CN
              </span>
            </div>
          </div>
        </header>

        <main className='flex-1 overflow-y-auto'>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
