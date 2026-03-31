"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  useUser,
  useTransactions,
  useSavingsGoals,
  useExchangeRate,
} from "@/hooks/use-supabase"
import { convertCurrency, formatCurrency } from "@/lib/exchange-rate"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

export default function DashboardPage() {
  const userId = useUser()
  const rate = useExchangeRate()
  const [displayCurrency, setDisplayCurrency] = useState<"ARS" | "USD">("ARS")

  const now = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const currentMonth = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    return format(d, "yyyy-MM")
  }, [monthOffset])

  const monthLabel = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    return format(d, "MMMM yyyy", { locale: es })
  }, [monthOffset])

  const { transactions, loading } = useTransactions(userId, currentMonth)
  const { goals } = useSavingsGoals(userId)

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    const categoryTotals: Record<string, number> = {}

    for (const t of transactions) {
      const amount =
        rate && displayCurrency !== t.currency
          ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
          : t.amount

      if (t.type === "income") {
        income += amount
      } else {
        expense += amount
        const catName = t.categories?.name ?? "Sin categoria"
        categoryTotals[catName] = (categoryTotals[catName] ?? 0) + amount
      }
    }

    const chartData = Object.entries(categoryTotals)
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    return { income, expense, balance: income - expense, chartData }
  }, [transactions, rate, displayCurrency])

  const totalSaved = useMemo(() => {
    let total = 0
    for (const g of goals) {
      for (const c of g.savings_contributions) {
        const amount =
          rate && displayCurrency !== c.currency
            ? convertCurrency(c.amount, c.currency, displayCurrency, rate)
            : c.amount
        total += amount
      }
    }
    return total
  }, [goals, rate, displayCurrency])

  const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ]

  if (!userId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonthOffset((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold capitalize">{monthLabel}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonthOffset((p) => p + 1)}
            disabled={monthOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            variant={displayCurrency === "ARS" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayCurrency("ARS")}
          >
            ARS
          </Button>
          <Button
            variant={displayCurrency === "USD" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayCurrency("USD")}
          >
            USD
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.income, displayCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.expense, displayCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance
            </CardTitle>
            <Wallet className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                summary.balance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.balance, displayCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ahorrado
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalSaved, displayCurrency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {goals.length} objetivo{goals.length !== 1 && "s"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gastos por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : summary.chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay gastos registrados este mes
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) =>
                    formatCurrency(Number(value), displayCurrency)
                  }
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {summary.chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultimos Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {t.description || t.categories?.name || "Sin descripcion"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.date), "dd/MM/yyyy")} -{" "}
                      {t.categories?.name}
                    </p>
                  </div>
                  <Badge
                    variant={t.type === "income" ? "default" : "destructive"}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount, t.currency)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
