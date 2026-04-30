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
  FileText,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const baseNavItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/dashboard/savings", label: "Ahorros", icon: PiggyBank },
  { href: "/dashboard/group", label: "Mi Grupo", icon: Users },
  { href: "/dashboard/report", label: "Reporte", icon: FileText },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
]

function GroupSwitcher({ onClick, mobile = false }: { onClick?: () => void; mobile?: boolean }) {
  const userId = useUser()
  const { groups } = useGroups(userId)
  const { currentGroupId, setCurrentGroupId } = useGroupContext()
  const [open, setOpen] = useState(false)

  const currentGroup = groups.find((g) => g.id === currentGroupId)
  const label = currentGroup?.name ?? "Personal"

  if (groups.length === 0) return null

  return (
    <div className="relative mb-3">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
          mobile
            ? "bg-muted hover:bg-muted/80 text-foreground"
            : "bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
        )}
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

function NavLinks({ onClick, mobile = false }: { onClick?: () => void; mobile?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {baseNavItems.map((item) => (
        <Link key={item.href} href={item.href} onClick={onClick}>
          <div
            className={cn(
              "flex items-center gap-3 px-3 rounded-lg font-medium transition-colors",
              mobile ? "py-3 text-base" : "py-2 text-sm",
              pathname === item.href
                ? mobile
                  ? "bg-primary text-primary-foreground"
                  : "bg-sidebar-primary text-sidebar-primary-foreground"
                : mobile
                  ? "text-foreground hover:bg-muted"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <item.icon className={mobile ? "h-5 w-5" : "h-4 w-4"} />
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
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <PiggyBank className="h-4 w-4 text-primary-foreground" />
          </div>
          <SheetTitle className="text-base font-bold">Finanzas Familia</SheetTitle>
        </div>

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <GroupSwitcher onClick={() => setOpen(false)} mobile />
          <NavLinks onClick={() => setOpen(false)} mobile />
        </div>

        {/* Logout pinned at bottom */}
        <div className="border-t px-3 py-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
