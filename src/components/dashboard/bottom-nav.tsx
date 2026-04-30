"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/dashboard/savings", label: "Ahorros", icon: PiggyBank },
  { href: "/dashboard/settings", label: "Config", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t safe-area-inset-bottom">
      <div className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 min-h-[56px]">
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
