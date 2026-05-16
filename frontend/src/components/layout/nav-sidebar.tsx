"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Plus,
  Filter,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"; 
import { signOut, useSession } from "next-auth/react";
import { logOutExistingUser } from "@/lib/auth/api";
import { toastError } from "@/lib/toastUtils";

const mainNav = [
  { label: "Dashboard", href: "/", key: "dashboard" },
  { label: "Jobs", href: "/jobs", key: "jobs" },
  { label: "Loans", href: "/loans", key: "loans" },
];

const secondaryNav = [
  { label: "Notifications", href: "/notifications", key: "notifications" },
  { label: "Settings", href: "/settings", key: "settings" },
  { label: "Help", href: "/help", key: "help" },
];

const jobsNav = [
  { label: "All Jobs", href: "/jobs", badge: "128" },
  {
    label: "My Applications",
    href: "/jobs/applications",
    badge: "4",
    children: [
      {
        label: "Pending Review",
        href: "/jobs/applications/pending",
        icon: Clock,
      },
      {
        label: "Shortlisted",
        href: "/jobs/applications/shortlisted",
        icon: Star,
      },
      {
        label: "Accepted",
        href: "/jobs/applications/accepted",
        icon: CheckCircle2,
      },
      { label: "Rejected", href: "/jobs/applications/rejected", icon: XCircle },
    ],
  },
  { label: "Saved Jobs", href: "/jobs/saved", badge: "12" },
  { label: "Recommended", href: "/jobs/recommended", badge: "34" },
];

const loansNav = [
  { label: "Overview", href: "/loans" },
  {
    label: "Active Loans",
    href: "/loans/active",
    badge: "2",
    children: [
      { label: "Home Loan", href: "/loans/active/home" },
      { label: "Personal Loan", href: "/loans/active/personal" },
    ],
  },
  { label: "Apply for Loan", href: "/loans/apply" },
  { label: "Repayment Schedule", href: "/loans/repayment" },
  { label: "Loan History", href: "/loans/history" },
];

type Section = "dashboard" | "jobs" | "loans" | null;

function getSection(pathname: string): Section {
  if (pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/loans")) return "loans";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  return null;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data:session } = useSession();
  const pathname = usePathname();
  const section = getSection(pathname);
  const { setOpen } = useSidebar();
  const router = useRouter();

  const hasSecondSidebar = section === "jobs" || section === "loans";

  return (
    // The outer Sidebar uses collapsible="icon" and the magic flex-row class.
    // This is exactly how sidebar-09 works — the two inner Sidebars lay out
    // side by side inside the outer one as a flex row.
    <Sidebar
      collapsible='icon'
      className='overflow-hidden *:data-[sidebar=sidebar]:flex-row'
      {...props}
    >
      {/* First inner sidebar: always visible, fixed width, text nav links */}
      <Sidebar
        collapsible='none'
        className='w-44! border-r bg-white text-black'
      >
        <SidebarHeader className='flex items-center px-4'>
          <span className='text-xl font-black tracking-tight text-black inline-flex gap-px font-inter'>
            <span className=''>Proof</span>
            <span className='text-black/40'>ident</span>
          </span>
        </SidebarHeader>

        <SidebarSeparator className='bg-black/10' />

        <SidebarContent className='py-2'>
          <SidebarGroup className='px-2'>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        onClick={() => setOpen(hasSecondSidebar)}
                        className='h-9 rounded-md px-3 font-inter text-sm text-black hover:bg-black/5 data-[active=true]:bg-black data-[active=true]:text-white transition-colors'
                      >
                        <Link href={item.href}>
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className='pb-4'>
          <SidebarSeparator className='bg-black/10 mb-2' />
          <SidebarGroup className='px-2'>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        disabled={true}
                        asChild
                        isActive={isActive}
                        className='h-9 rounded-md px-3 font-inter text-sm text-black/20 hover:text-black/20 hover:bg-black/0 data-[active=true]:bg-black data-[active=true]:text-white transition-colors cursor-default'
                      >
                        <Link href={item.href}>
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={async () => {
                      try {
                        const result = await logOutExistingUser(
                          session?.refreshToken ?? "",
                        );
                        if (result === true) {
                          await signOut({ redirect: false });
                          router.push("/login");
                          return;
                        }
                      } catch (err) {
                        toastError(
                          err instanceof Error ? err.message : String(err),
                        );
                      }
                    }}
                    className='h-9 rounded-md px-3 font-inter text-sm text-black/60 hover:text-black hover:bg-black/5 transition-colors'
                  >
                    <LogOut className='h-4 w-4' />
                    <span>Log out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>

      {/* Second inner sidebar: only shown for jobs and loans */}
      {/* {section === "jobs" && <JobsSecondSidebar pathname={pathname} />}
      {section === "loans" && <LoansSecondSidebar pathname={pathname} />} */}
    </Sidebar>
  );
}
