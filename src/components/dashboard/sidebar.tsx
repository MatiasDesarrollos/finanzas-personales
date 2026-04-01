"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Settings,
  LogOut,
  Menu,
  Wallet,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/dashboard/savings", label: "Ahorros", icon: PiggyBank },
  { href: "/dashboard/settings", label: "Configuracion", icon: Settings },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} onClick={onClick}>
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </div>
        </Link>
      ))}
    </nav>
  )
}

export function Sidebar() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="hidden md:flex w-64 flex-col justify-between p-4 bg-sidebar text-sidebar-foreground">
      <div>
        <div className="flex items-center gap-2 mb-8 px-3">
          <PiggyBank className="h-6 w-6 text-sidebar-primary" />
          <h2 className="text-lg font-bold">Finanzas Familia</h2>
        </div>
        <NavLinks />
      </div>
      <Button variant="ghost" className="justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        Cerrar sesion
      </Button>
    </aside>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-4">
        <SheetTitle className="text-lg font-bold mb-6">Finanzas Familia</SheetTitle>
        <div className="flex flex-col justify-between h-[calc(100%-3rem)]">
          <NavLinks onClick={() => setOpen(false)} />
          <Button variant="ghost" className="justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
