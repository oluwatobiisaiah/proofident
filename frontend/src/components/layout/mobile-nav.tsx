"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Briefcase,
  Landmark,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
} from "lucide-react"
import { useState } from "react"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

const mainNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { label: "Jobs", href: "/jobs", icon: Briefcase, key: "jobs" },
  { label: "Loans", href: "/loans", icon: Landmark, key: "loans" },
]

const secondaryNav = [
  { label: "Notifications", href: "/notifications", icon: Bell, key: "notifications" },
  { label: "Settings", href: "/settings", icon: Settings, key: "settings" },
  { label: "Help", href: "/help", icon: HelpCircle, key: "help" },
]

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-black hover:bg-black/5"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 p-0 bg-white text-black border-r border-black/10 flex flex-col"
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-black/10 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-black text-white font-bold font-ptserif text-sm select-none">
            A
          </div>
          <span className="font-ptserif font-semibold text-base text-black tracking-tight">
            Acme Inc.
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1">
          <p className="font-inter text-xs text-black/40 uppercase tracking-widest px-2 py-2">
            Navigation
          </p>
          {mainNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-md font-inter text-sm transition-colors",
                  isActive
                    ? "bg-black text-white"
                    : "text-black hover:bg-black/5",
                ].join(" ")}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-2 pb-4 flex flex-col gap-1 border-t border-black/10 pt-3">
          <p className="font-inter text-xs text-black/40 uppercase tracking-widest px-2 py-2">
            Account
          </p>
          {secondaryNav.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-md font-inter text-sm transition-colors",
                  isActive
                    ? "bg-black text-white"
                    : "text-black/70 hover:text-black hover:bg-black/5",
                ].join(" ")}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-md font-inter text-sm text-black/70 hover:text-black hover:bg-black/5 transition-colors w-full text-left">
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
