"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useUser, useTransactions, useMonthlyTotals, useSavingsGoals, useExchangeRate } from "@/hooks/use-supabase"
import { formatCurrency, convertCurrency } from "@/lib/exchange-rate"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Printer, FileText, TrendingUp, TrendingDown, PiggyBank, Wallet } from "lucide-react"

function isSaving(desc: string | null | undefined) {
  return (desc ?? "").startsWith("[Ahorro]")
}

export default function ReportPage() {
  const userId = useUser()
  const rate = useExchangeRate()
  const { data: monthlyData } = useMonthlyTotals(userId)
  const { goals } = useSavingsGoals(userId)

  const nowKey = format(new Date(), "yyyy-MM")
  const [selectedMonth, setSelectedMonth] = useState(nowKey)
  const [displayCurrency, setDisplayCurrency] = useState<"ARS" | "USD">("ARS")

  const { transactions, loading } = useTransactions(userId, selectedMonth)

  const summary = useMemo(() => {
    let income = 0, expense = 0, ahorro = 0
    for (const t of transactions) {
      const amt = rate && displayCurrency !== t.currency
        ? convertCurrency(t.amount, t.currency, displayCurrency, rate) : t.amount
      if (t.type === "income") income += amt
      else if (isSaving(t.description)) ahorro += amt
      else expense += amt
    }
    return { income, expense, ahorro, balance: income - expense - ahorro }
  }, [transactions, rate, displayCurrency])

  const byCategory = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {}
    for (const t of transactions) {
      if (t.type !== "expense" || isSaving(t.description)) continue
      const name = t.categories?.name ?? "Sin categoría"
      if (!map[name]) map[name] = { name, total: 0, count: 0 }
      const amt = rate && displayCurrency !== t.currency
        ? convertCurrency(t.amount, t.currency, displayCurrency, rate) : t.amount
      map[name].total += amt
      map[name].count++
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [transactions, rate, displayCurrency])

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number)
    return format(new Date(y, m - 1, 1), "MMMM yyyy", { locale: es })
  }, [selectedMonth])

  const handlePrint = () => window.print()

  if (!userId) return null

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          @page { margin: 1.5cm; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Controls — hidden on print */}
        <div className="no-print flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Reporte Mensual
          </h1>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={v => v && setSelectedMonth(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue>{monthLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {monthlyData.map(m => (
                  <SelectItem key={m.monthKey} value={m.monthKey} className="capitalize">
                    {m.month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={displayCurrency} onValueChange={v => v && setDisplayCurrency(v as "ARS" | "USD")}>
              <SelectTrigger className="w-20">
                <SelectValue>{displayCurrency}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">ARS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* Report header — visible on print */}
        <div className="print-only text-center mb-6">
          <h1 className="text-2xl font-bold">Finanzas Familia</h1>
          <p className="text-muted-foreground capitalize">Reporte — {monthLabel}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Ingresos", value: summary.income, icon: TrendingUp, color: "text-green-600" },
            { label: "Gastos", value: summary.expense, icon: TrendingDown, color: "text-red-600" },
            { label: "Ahorros", value: summary.ahorro, icon: PiggyBank, color: "text-blue-600" },
            { label: "Sobrante", value: summary.balance, icon: Wallet, color: summary.balance >= 0 ? "text-green-600" : "text-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <p className={`text-lg font-bold ${color}`}>{formatCurrency(value, displayCurrency)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Expense by category */}
        {byCategory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gastos por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {byCategory.map(({ name, total, count }) => {
                  const pct = summary.expense > 0 ? Math.round((total / summary.expense) * 100) : 0
                  return (
                    <div key={name} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">{count} transacción{count !== 1 ? "es" : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(total, displayCurrency)}</p>
                        <p className="text-xs text-muted-foreground">{pct}% del total</p>
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between py-2.5 font-semibold">
                  <span className="text-sm">Total gastos</span>
                  <span className="text-sm text-red-600">{formatCurrency(summary.expense, displayCurrency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction detail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle de movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos este mes</p>
            ) : (
              <div className="divide-y text-sm">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">
                        {(t.description ?? "").replace(/^\[Ahorro\]\s*/, "") || t.categories?.name || "Sin descripción"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.date + "T00:00:00"), "dd/MM/yyyy")}
                        {t.categories?.name ? ` · ${t.categories.name}` : ""}
                      </p>
                    </div>
                    <span className={`font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="print-only text-center text-xs text-muted-foreground mt-8">
          Generado por Finanzas Familia · {format(new Date(), "dd/MM/yyyy HH:mm")}
        </div>
      </div>
    </>
  )
}
