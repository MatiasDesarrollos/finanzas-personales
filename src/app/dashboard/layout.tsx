export const dynamic = "force-dynamic"

import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar"
import { ExchangeRateBadge } from "@/components/dashboard/exchange-rate-badge"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 shadow-sm">
          <MobileSidebar />
          <div className="ml-auto">
            <ExchangeRateBadge />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
