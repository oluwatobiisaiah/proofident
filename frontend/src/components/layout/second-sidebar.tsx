"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Plus, Filter, Star, Clock, CheckCircle2, XCircle } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
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
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const jobsNav = [
  {
    label: "All Jobs",
    href: "/jobs",
    badge: "128",
  },
  {
    label: "My Applications",
    href: "/jobs/applications",
    badge: "4",
    children: [
      { label: "Pending Review", href: "/jobs/applications/pending", icon: Clock },
      { label: "Shortlisted", href: "/jobs/applications/shortlisted", icon: Star },
      { label: "Accepted", href: "/jobs/applications/accepted", icon: CheckCircle2 },
      { label: "Rejected", href: "/jobs/applications/rejected", icon: XCircle },
    ],
  },
  {
    label: "Saved Jobs",
    href: "/jobs/saved",
    badge: "12",
  },
  {
    label: "Recommended",
    href: "/jobs/recommended",
    badge: "34",
  },
]

const loansNav = [
  {
    label: "Overview",
    href: "/loans",
  },
  {
    label: "Active Loans",
    href: "/loans/active",
    badge: "2",
    children: [
      { label: "Home Loan", href: "/loans/active/home" },
      { label: "Personal Loan", href: "/loans/active/personal" },
    ],
  },
  {
    label: "Apply for Loan",
    href: "/loans/apply",
  },
  {
    label: "Repayment Schedule",
    href: "/loans/repayment",
  },
  {
    label: "Loan History",
    href: "/loans/history",
  },
]

function JobsContent({ pathname }: { pathname: string }) {
  return (
    <>
      <SidebarHeader className="h-14 flex flex-row items-center justify-between px-4 border-b border-black/10 shrink-0">
        <span className="font-ptserif font-semibold text-base text-black tracking-tight">
          Jobs
        </span>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-black/5 text-black/60 hover:text-black transition-colors">
            <Filter className="h-4 w-4" />
          </button>
          <button className="p-1 rounded hover:bg-black/5 text-black/60 hover:text-black transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white text-black">
        <SidebarGroup>
          <SidebarGroupLabel className="font-inter text-xs text-black/40 uppercase tracking-widest px-3 py-2">
            Browse
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {jobsNav.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/")

                if (item.children) {
                  return (
                    <Collapsible
                      key={item.href}
                      defaultOpen={isActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive}
                            className="font-inter text-sm text-black hover:bg-black/5 data-[active=true]:bg-black/8 data-[active=true]:font-medium rounded-md transition-colors"
                          >
                            <span>{item.label}</span>
                            {item.badge && (
                              <SidebarMenuBadge className="font-inter text-xs bg-black/8 text-black/60 rounded ml-auto mr-1">
                                {item.badge}
                              </SidebarMenuBadge>
                            )}
                            <ChevronRight className="ml-auto h-4 w-4 text-black/40 transition-transform group-data-[state=open]/collapsible:rotate-90 shrink-0" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="border-l border-black/10 ml-3">
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === child.href}
                                  className="font-inter text-sm text-black/70 hover:text-black hover:bg-black/5 data-[active=true]:text-black data-[active=true]:font-medium transition-colors"
                                >
                                  <Link href={child.href}>
                                    {child.icon && (
                                      <child.icon className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span>{child.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="font-inter text-sm text-black hover:bg-black/5 data-[active=true]:bg-black/8 data-[active=true]:font-medium rounded-md transition-colors"
                    >
                      <Link href={item.href}>
                        <span>{item.label}</span>
                        {item.badge && (
                          <SidebarMenuBadge className="font-inter text-xs bg-black/8 text-black/60 rounded">
                            {item.badge}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Placeholder slot for custom element — later tailor this */}
        <SidebarSeparator className="bg-black/10 my-1" />
        <SidebarGroup>
          <SidebarGroupLabel className="font-inter text-xs text-black/40 uppercase tracking-widest px-3 py-2">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2">
              <div className="rounded-lg border border-black/10 bg-black/2 p-3 text-center">
                <p className="font-inter text-xs text-black/40 leading-relaxed">
                  Custom job element goes here
                </p>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  )
}

function LoansContent({ pathname }: { pathname: string }) {
  return (
    <>
      <SidebarHeader className="h-14 flex flex-row items-center justify-between px-4 border-b border-black/10 shrink-0">
        <span className="font-ptserif font-semibold text-base text-black tracking-tight">
          Loans
        </span>
        <button className="p-1 rounded hover:bg-black/5 text-black/60 hover:text-black transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </SidebarHeader>

      <SidebarContent className="bg-white text-black">
        <SidebarGroup>
          <SidebarGroupLabel className="font-inter text-xs text-black/40 uppercase tracking-widest px-3 py-2">
            Manage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loansNav.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/")

                if (item.children) {
                  return (
                    <Collapsible
                      key={item.href}
                      defaultOpen={isActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive}
                            className="font-inter text-sm text-black hover:bg-black/5 data-[active=true]:bg-black/8 data-[active=true]:font-medium rounded-md transition-colors"
                          >
                            <span>{item.label}</span>
                            {item.badge && (
                              <SidebarMenuBadge className="font-inter text-xs bg-black/8 text-black/60 rounded ml-auto mr-1">
                                {item.badge}
                              </SidebarMenuBadge>
                            )}
                            <ChevronRight className="ml-auto h-4 w-4 text-black/40 transition-transform group-data-[state=open]/collapsible:rotate-90 shrink-0" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="border-l border-black/10 ml-3">
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === child.href}
                                  className="font-inter text-sm text-black/70 hover:text-black hover:bg-black/5 data-[active=true]:text-black data-[active=true]:font-medium transition-colors"
                                >
                                  <Link href={child.href}>
                                    <span>{child.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="font-inter text-sm text-black hover:bg-black/5 data-[active=true]:bg-black/8 data-[active=true]:font-medium rounded-md transition-colors"
                    >
                      <Link href={item.href}>
                        <span>{item.label}</span>
                        {item.badge && (
                          <SidebarMenuBadge className="font-inter text-xs bg-black/8 text-black/60 rounded">
                            {item.badge}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-black/10 my-1" />
        <SidebarGroup>
          <SidebarGroupLabel className="font-inter text-xs text-black/40 uppercase tracking-widest px-3 py-2">
            Summary
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 space-y-2">
              <div className="rounded-lg border border-black/10 p-3">
                <p className="font-inter text-xs text-black/40 mb-1">Total Outstanding</p>
                <p className="font-ptserif text-lg font-semibold text-black">₦2,400,000</p>
              </div>
              <div className="rounded-lg border border-black/10 p-3">
                <p className="font-inter text-xs text-black/40 mb-1">Next Payment</p>
                <p className="font-ptserif text-lg font-semibold text-black">₦85,000</p>
                <p className="font-inter text-xs text-black/40 mt-0.5">Due Jun 1, 2026</p>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  )
}

type Section = "dashboard" | "jobs" | "loans" | null

function getActiveSection(pathname: string): Section {
  if (pathname.startsWith("/jobs")) return "jobs"
  if (pathname.startsWith("/loans")) return "loans"
  if (pathname.startsWith("/dashboard")) return "dashboard"
  return null
}

export function SecondSidebar() {
  const pathname = usePathname()
  const section = getActiveSection(pathname)

  // Dashboard has no second sidebar
  if (section === "dashboard" || section === null) {
    return null
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      className="hidden md:flex border-r bg-white text-black"
    >
      {section === "jobs" && <JobsContent pathname={pathname} />}
      {section === "loans" && <LoansContent pathname={pathname} />}
    </Sidebar>
  )
}
