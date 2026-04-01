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
  useMonthlyTotals,
} from "@/hooks/use-supabase"
import { convertCurrency, formatCurrency } from "@/lib/exchange-rate"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  CalendarDays,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts"

function isSavingTransaction(desc: string | null | undefined) {
  return (desc ?? "").startsWith("[Ahorro]")
}

export default function DashboardPage() {
  const userId = useUser()
  const rate = useExchangeRate()
  const [displayCurrency, setDisplayCurrency] = useState<"ARS" | "USD">("ARS")
  const { data: monthlyData } = useMonthlyTotals(userId)
  const { goals } = useSavingsGoals(userId)

  // Default: select current month if it has data, otherwise null = Todos
  const nowKey = format(new Date(), "yyyy-MM")
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(nowKey)

  // Transactions for selected month (for category chart + recent list)
  const activeMonthKey = selectedMonthKey ?? nowKey
  const { transactions, loading } = useTransactions(userId, activeMonthKey)

  // Summary cards — computed from per-month transactions with currency conversion
  const summary = useMemo(() => {
    if (selectedMonthKey) {
      // Compute from actual transactions (currency-aware)
      let income = 0, expense = 0, ahorro = 0
      for (const t of transactions) {
        const amt = rate && displayCurrency !== t.currency
          ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
          : t.amount
        if (t.type === "income") income += amt
        else if (isSavingTransaction(t.description)) ahorro += amt
        else expense += amt
      }
      return { income, expense, ahorro, balance: income - expense - ahorro }
    } else {
      // Aggregate from all months (raw amounts, best-effort)
      const agg = monthlyData.reduce(
        (acc, m) => ({
          income: acc.income + m.ingresos,
          expense: acc.expense + m.gastos,
          ahorro: acc.ahorro + m.ahorro,
          balance: acc.balance + m.balance,
        }),
        { income: 0, expense: 0, ahorro: 0, balance: 0 }
      )
      return agg
    }
  }, [selectedMonthKey, transactions, monthlyData, rate, displayCurrency])

  // Category breakdown for the selected month
  const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ]
  const categoryData = useMemo(() => {
    if (!selectedMonthKey) return []
    const cats: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type === "expense" && !isSavingTransaction(t.description)) {
        const amt = rate && displayCurrency !== t.currency
          ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
          : t.amount
        const name = t.categories?.name ?? "Sin categoria"
        cats[name] = (cats[name] ?? 0) + amt
      }
    }
    return Object.entries(cats)
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [transactions, selectedMonthKey, rate, displayCurrency])

  const totalSaved = useMemo(() => {
    let total = 0
    for (const g of goals) {
      for (const c of g.savings_contributions) {
        const amt = rate && displayCurrency !== c.currency
          ? convertCurrency(c.amount, c.currency, displayCurrency, rate)
          : c.amount
        total += amt
      }
    }
    return total
  }, [goals, rate, displayCurrency])

  const selectedLabel = useMemo(() => {
    if (!selectedMonthKey) return "Todos los meses"
    const m = monthlyData.find((m) => m.monthKey === selectedMonthKey)
    if (m) return m.month
    const [y, mo] = selectedMonthKey.split("-").map(Number)
    return format(new Date(y, mo - 1, 1), "MMM yy", { locale: es })
  }, [selectedMonthKey, monthlyData])

  if (!userId) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold">Resumen</h1>
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

      {/* Comparative chart — ALL months, clickable */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Comparativo mensual
              <span className="text-xs font-normal text-muted-foreground ml-1">
                (clic en un mes para ver su detalle)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={monthlyData}
                barGap={2}
                barCategoryGap="20%"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(e: any) => {
                  const key = e?.activePayload?.[0]?.payload?.monthKey as string | undefined
                  if (key) setSelectedMonthKey((prev) => (prev === key ? null : key))
                }}
                style={{ cursor: "pointer" }}
              >
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}k`
                      : String(v)
                  }
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value), "ARS"),
                    name === "ingresos"
                      ? "Ingresos"
                      : name === "gastos"
                      ? "Gastos"
                      : name === "ahorro"
                      ? "Ahorros"
                      : "Balance",
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend
                  formatter={(v) =>
                    v === "ingresos"
                      ? "Ingresos"
                      : v === "gastos"
                      ? "Gastos"
                      : v === "ahorro"
                      ? "Ahorros"
                      : v
                  }
                />
                {monthlyData.map((m) => {
                  const isSelected = selectedMonthKey === m.monthKey
                  return null // bars handle color via Cell below
                })}
                <Bar dataKey="ingresos" radius={[3, 3, 0, 0]}>
                  {monthlyData.map((m) => (
                    <Cell
                      key={m.monthKey}
                      fill={selectedMonthKey === m.monthKey ? "#15803d" : "#16a34a"}
                      opacity={selectedMonthKey && selectedMonthKey !== m.monthKey ? 0.45 : 1}
                    />
                  ))}
                </Bar>
                <Bar dataKey="gastos" radius={[3, 3, 0, 0]}>
                  {monthlyData.map((m) => (
                    <Cell
                      key={m.monthKey}
                      fill={selectedMonthKey === m.monthKey ? "#b91c1c" : "#dc2626"}
                      opacity={selectedMonthKey && selectedMonthKey !== m.monthKey ? 0.45 : 1}
                    />
                  ))}
                </Bar>
                <Bar dataKey="ahorro" radius={[3, 3, 0, 0]}>
                  {monthlyData.map((m) => (
                    <Cell
                      key={m.monthKey}
                      fill={selectedMonthKey === m.monthKey ? "#1d4ed8" : "#2563eb"}
                      opacity={selectedMonthKey && selectedMonthKey !== m.monthKey ? 0.45 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Month filter pills */}
      {monthlyData.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <Button
            variant={!selectedMonthKey ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMonthKey(null)}
          >
            Todos
          </Button>
          {monthlyData.map((m) => (
            <Button
              key={m.monthKey}
              variant={selectedMonthKey === m.monthKey ? "default" : "outline"}
              size="sm"
              className="capitalize"
              onClick={() =>
                setSelectedMonthKey((prev) =>
                  prev === m.monthKey ? null : m.monthKey
                )
              }
            >
              {m.month}
            </Button>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div>
        <p className="text-sm text-muted-foreground mb-3 capitalize font-medium">
          {selectedLabel}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-600">
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
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(summary.expense, displayCurrency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ahorros
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(summary.ahorro, displayCurrency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sobrante
              </CardTitle>
              <Wallet className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <p
                className={`text-xl font-bold ${
                  summary.balance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(summary.balance, displayCurrency)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Total saved (all goals, all time) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total ahorrado en objetivos
          </CardTitle>
          <PiggyBank className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-blue-600">
            {formatCurrency(totalSaved, displayCurrency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {goals.length} objetivo{goals.length !== 1 && "s"}
          </p>
        </CardContent>
      </Card>

      {/* Category breakdown — only when a month is selected */}
      {selectedMonthKey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base capitalize">
              Gastos por Categoría — {selectedLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay gastos registrados este mes
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, categoryData.length * 38)}>
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(Number(value), displayCurrency)
                    }
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {categoryData.map((_, index) => (
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
      )}

      {/* Recent transactions — only when a month is selected */}
      {selectedMonthKey && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos movimientos — {selectedLabel}</CardTitle>
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
                      {(t.description ?? "").replace(/^\[Ahorro\]\s*/, "") ||
                        t.categories?.name ||
                        "Sin descripcion"}
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
