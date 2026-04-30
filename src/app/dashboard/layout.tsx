export const dynamic = "force-dynamic"

import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar"
import { ExchangeRateBadge } from "@/components/dashboard/exchange-rate-badge"
import { GroupProvider } from "@/contexts/group-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { BottomNav } from "@/components/dashboard/bottom-nav"
import { QuickAddButton } from "@/components/dashboard/quick-add-button"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <GroupProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b bg-card flex items-center justify-between px-4 shadow-sm">
            <MobileSidebar />
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <ExchangeRateBadge />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-16 md:pb-6">
            {children}
          </main>
        </div>
      </div>
      <QuickAddButton />
      <BottomNav />
    </GroupProvider>
  )
}
