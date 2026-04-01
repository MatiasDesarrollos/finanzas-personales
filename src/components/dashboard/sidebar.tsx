"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUser, useGroups } from "@/hooks/use-supabase"
import { useGroupContext } from "@/contexts/group-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Settings,
  LogOut,
  Menu,
  Users,
  ChevronDown,
  Check,
  Plus,
  CreditCard,
  FileText,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const baseNavItems = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/dashboard/savings", label: "Ahorros", icon: PiggyBank },
  { href: "/dashboard/installments", label: "Cuotas", icon: CreditCard },
  { href: "/dashboard/group", label: "Mi Grupo", icon: Users },
  { href: "/dashboard/report", label: "Reporte", icon: FileText },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
]

function GroupSwitcher({ onClick }: { onClick?: () => void }) {
  const userId = useUser()
  const { groups } = useGroups(userId)
  const { currentGroupId, setCurrentGroupId } = useGroupContext()
  const [open, setOpen] = useState(false)

  const currentGroup = groups.find((g) => g.id === currentGroupId)
  const label = currentGroup?.name ?? "Personal"

  if (groups.length === 0) return null

  return (
    <div className="relative mb-4">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors"
      >
        <span className="flex items-center gap-2">
          {currentGroupId ? <Users className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 text-center leading-none">👤</span>}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-50 overflow-hidden">
          <button
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
            onClick={() => { setCurrentGroupId(null); setOpen(false); onClick?.() }}
          >
            <span className="h-4 w-4 text-center leading-none">👤</span>
            Personal
            {!currentGroupId && <Check className="h-3.5 w-3.5 ml-auto text-blue-600" />}
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left border-t"
              onClick={() => { setCurrentGroupId(g.id); setOpen(false); onClick?.() }}
            >
              <Users className="h-4 w-4 text-teal-600" />
              <span className="truncate">{g.name}</span>
              {currentGroupId === g.id && <Check className="h-3.5 w-3.5 ml-auto text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {baseNavItems.map((item) => (
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
        <div className="flex items-center gap-2 mb-6 px-3">
          <PiggyBank className="h-6 w-6 text-sidebar-primary" />
          <h2 className="text-lg font-bold">Finanzas Familia</h2>
        </div>
        <GroupSwitcher />
        <NavLinks />
      </div>
      <Button
        variant="ghost"
        className="justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
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
        <SheetTitle className="text-lg font-bold mb-4">Finanzas Familia</SheetTitle>
        <div className="flex flex-col justify-between h-[calc(100%-3rem)]">
          <div>
            <GroupSwitcher onClick={() => setOpen(false)} />
            <NavLinks onClick={() => setOpen(false)} />
          </div>
          <Button variant="ghost" className="justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
