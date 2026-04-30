"use client"

import { useMemo, useState } from "react"
import { format, addMonths } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { useUser, useTransactions, useExchangeRate, useCategories } from "@/hooks/use-supabase"
import { convertCurrency, formatCurrency } from "@/lib/exchange-rate"
import {
  TrendingUp, TrendingDown, PiggyBank, Wallet,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const supabase = createClient()

function isSaving(desc: string | null | undefined) {
  return (desc ?? "").startsWith("[Ahorro]")
}

// Color palette for categories (cycling)
const BAR_COLORS = [
  "bg-emerald-500", "bg-amber-400", "bg-blue-500",
  "bg-purple-500", "bg-pink-500", "bg-teal-500", "bg-orange-400",
]
const LABEL_COLORS = [
  "text-emerald-600", "text-amber-500", "text-blue-600",
  "text-purple-600", "text-pink-600", "text-teal-600", "text-orange-500",
]
const DOT_COLORS = [
  "bg-emerald-500", "bg-amber-400", "bg-blue-500",
  "bg-purple-500", "bg-pink-500", "bg-teal-500", "bg-orange-400",
]

// ─── Delta pill ───────────────────────────────────────────────────────────────
function DeltaPill({
  delta, type = "expense",
}: { delta: number | null; type?: "income" | "expense" }) {
  if (delta === null) return null
  if (delta === 0)
    return <span className="text-xs text-slate-400 font-medium">igual</span>
  const isPositive = delta > 0
  const isGood = type === "income" ? isPositive : !isPositive
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full",
      isGood ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
    )}>
      {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(delta)}%
    </span>
  )
}

// ─── Inline quick-add ─────────────────────────────────────────────────────────
function QuickAdd({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [txType, setTxType] = useState<"income" | "expense">("expense")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { categories } = useCategories(userId)

  const filteredCats = categories.filter(c => c.type === txType)

  function handleTypeChange(type: "income" | "expense") {
    setTxType(type)
    setCategoryId(null)
  }

  async function handleSave() {
    const amt = parseFloat(amount.replace(",", "."))
    if (!amt || isNaN(amt)) return
    setSaving(true)
    await supabase.from("transactions").insert({
      user_id: userId,
      type: txType,
      amount: amt,
      currency: "ARS",
      date: format(new Date(), "yyyy-MM-dd"),
      ...(categoryId ? { category_id: categoryId } : {}),
      is_recurring: false,
    })
    setAmount("")
    setCategoryId(null)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleTypeChange("income")}
          className={cn(
            "py-2.5 rounded-xl text-sm font-bold transition-all",
            txType === "income"
              ? "bg-green-500 text-white shadow-sm"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          + Cargar ingreso
        </button>
        <button
          onClick={() => handleTypeChange("expense")}
          className={cn(
            "py-2.5 rounded-xl text-sm font-bold transition-all",
            txType === "expense"
              ? "bg-red-500 text-white shadow-sm"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          − Cargar egreso
        </button>
      </div>

      {/* Category chips */}
      {filteredCats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {filteredCats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                categoryId === cat.id
                  ? txType === "income"
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-red-500 text-white border-red-500"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Amount row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!amount || saving}
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
            txType === "income" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600",
            (!amount || saving) && "opacity-40 cursor-not-allowed"
          )}
        >
          {saving ? "..." : "Guardar"}
        </button>
      </div>
      <p className="text-xs text-slate-400 text-center">
        Para más opciones (fecha, descripción) usá el botón <strong>+</strong>
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const userId = useUser()
  const rate = useExchangeRate()
  const [monthOffset, setMonthOffset] = useState(0)

  const currentDate = useMemo(() => addMonths(new Date(), monthOffset), [monthOffset])
  const monthKey    = useMemo(() => format(currentDate, "yyyy-MM"), [currentDate])
  const monthLabel  = useMemo(() => format(currentDate, "MMMM yyyy", { locale: es }), [currentDate])

  const prevMonthKey = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number)
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
  }, [monthKey])

  const { transactions, loading, refresh } = useTransactions(userId, monthKey)
  const { transactions: prevTxs } = useTransactions(userId, prevMonthKey)

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let income = 0, expense = 0, ahorro = 0
    for (const t of transactions) {
      const amt = rate && t.currency !== "ARS"
        ? convertCurrency(t.amount, t.currency, "ARS", rate) : t.amount
      if (t.type === "income") income += amt
      else if (isSaving(t.description)) ahorro += amt
      else expense += amt
    }
    return { income, expense, ahorro, balance: income - expense - ahorro }
  }, [transactions, rate])

  // ── Category breakdown (expenses + Δ%) ──────────────────────────────────────
  const categoryData = useMemo(() => {
    const curr: Record<string, number> = {}
    const prev: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type !== "expense" || isSaving(t.description)) continue
      const cat = t.categories?.name ?? "Sin categoría"
      const amt = rate && t.currency !== "ARS" ? convertCurrency(t.amount, t.currency, "ARS", rate) : t.amount
      curr[cat] = (curr[cat] ?? 0) + amt
    }
    for (const t of prevTxs) {
      if (t.type !== "expense" || isSaving(t.description)) continue
      const cat = t.categories?.name ?? "Sin categoría"
      const amt = rate && t.currency !== "ARS" ? convertCurrency(t.amount, t.currency, "ARS", rate) : t.amount
      prev[cat] = (prev[cat] ?? 0) + amt
    }
    const total = Object.values(curr).reduce((s, v) => s + v, 0)
    return Object.entries(curr)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
        delta: (prev[name] ?? 0) > 0 ? Math.round(((amount - prev[name]) / prev[name]) * 100) : null,
      }))
  }, [transactions, prevTxs, rate])

  // ── Income breakdown (per concept + Δ%) ─────────────────────────────────────
  const incomeData = useMemo(() => {
    const curr: Record<string, number> = {}
    const prev: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type !== "income") continue
      const key = t.categories?.name ?? t.description ?? "Otros ingresos"
      const amt = rate && t.currency !== "ARS" ? convertCurrency(t.amount, t.currency, "ARS", rate) : t.amount
      curr[key] = (curr[key] ?? 0) + amt
    }
    for (const t of prevTxs) {
      if (t.type !== "income") continue
      const key = t.categories?.name ?? t.description ?? "Otros ingresos"
      const amt = rate && t.currency !== "ARS" ? convertCurrency(t.amount, t.currency, "ARS", rate) : t.amount
      prev[key] = (prev[key] ?? 0) + amt
    }
    return Object.entries(curr)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => ({
        name, amount,
        prevAmount: prev[name] ?? 0,
        delta: (prev[name] ?? 0) > 0 ? Math.round(((amount - prev[name]) / prev[name]) * 100) : null,
      }))
  }, [transactions, prevTxs, rate])

  // ── Recent 5 transactions ────────────────────────────────────────────────────
  const recentTxs = useMemo(() =>
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [transactions]
  )

  if (!userId) return null

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-28">

      {/* Month navigation */}
      <div className="flex items-center justify-between py-1 sticky top-0 bg-background z-10 border-b pb-3">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold capitalize text-slate-800">{monthLabel}</h1>
          {monthOffset !== 0 && (
            <button onClick={() => setMonthOffset(0)} className="text-xs text-primary hover:underline">
              Volver al mes actual
            </button>
          )}
        </div>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          disabled={monthOffset >= 3}
          className={cn("p-2 rounded-xl hover:bg-slate-100 transition-colors", monthOffset >= 3 && "opacity-30")}
        >
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Income */}
        <SummaryCard
          label="Ingresos del mes"
          value={formatCurrency(totals.income, "ARS")}
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          iconBg="bg-green-100"
          valueColor="text-green-600"
          border="border-green-100"
        />
        {/* Expense */}
        <SummaryCard
          label="Egresos del mes"
          value={formatCurrency(totals.expense, "ARS")}
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          iconBg="bg-red-100"
          valueColor="text-red-500"
          border="border-red-100"
        />
        {/* Balance */}
        <SummaryCard
          label="Saldo disponible"
          value={formatCurrency(Math.abs(totals.balance), "ARS")}
          icon={<Wallet className={cn("h-4 w-4", totals.balance >= 0 ? "text-emerald-600" : "text-orange-500")} />}
          iconBg={totals.balance >= 0 ? "bg-emerald-100" : "bg-orange-100"}
          valueColor={totals.balance >= 0 ? "text-emerald-600" : "text-orange-500"}
          border={totals.balance >= 0 ? "border-emerald-100" : "border-orange-100"}
          colSpan={totals.ahorro > 0 ? 1 : 2}
        />
        {/* Savings */}
        {totals.ahorro > 0 && (
          <SummaryCard
            label="Ahorros del mes"
            value={formatCurrency(totals.ahorro, "ARS")}
            icon={<PiggyBank className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-100"
            valueColor="text-blue-600"
            border="border-blue-100"
          />
        )}
      </div>

      {/* ── Quick add ───────────────────────────────────────────────────────── */}
      <QuickAdd userId={userId} onSaved={refresh} />

      {loading && (
        <p className="text-center text-sm text-slate-400 py-6">Cargando...</p>
      )}

      {/* ── Gastos por categoría ─────────────────────────────────────────────── */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Gastos por categoría</h2>
            <Link href="/dashboard/transactions" className="text-xs text-primary font-semibold hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="px-4 py-2 divide-y divide-slate-50">
            {categoryData.map(({ name, amount, pct, delta }, i) => (
              <div key={name} className="py-3">
                {/* Row: name | delta pill | amount | % */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", DOT_COLORS[i % DOT_COLORS.length])} />
                  <span className="text-sm font-semibold text-slate-700 flex-1 truncate">{name}</span>
                  <DeltaPill delta={delta} type="expense" />
                  <span className="text-sm font-bold text-slate-800 tabular-nums">
                    {formatCurrency(amount, "ARS")}
                  </span>
                </div>
                {/* Progress bar + % */}
                <div className="flex items-center gap-2 pl-4">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", BAR_COLORS[i % BAR_COLORS.length])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn("text-xs font-bold w-8 text-right tabular-nums", LABEL_COLORS[i % LABEL_COLORS.length])}>
                    {pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ingresos por concepto ────────────────────────────────────────────── */}
      {incomeData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Ingresos</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {incomeData.map(({ name, amount, delta, prevAmount }) => (
              <div key={name} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                  {prevAmount > 0 ? (
                    <p className="text-xs text-slate-400 tabular-nums">
                      Mes anterior: {formatCurrency(prevAmount, "ARS")}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">Sin dato del mes anterior</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-bold text-green-600 tabular-nums">
                    {formatCurrency(amount, "ARS")}
                  </span>
                  <DeltaPill delta={delta} type="income" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Últimos movimientos ──────────────────────────────────────────────── */}
      {recentTxs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Últimos movimientos</h2>
            <Link href="/dashboard/transactions" className="text-xs text-primary font-semibold hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentTxs.map(t => {
              const isIncome = t.type === "income"
              const isSavingTx = isSaving(t.description)
              const label =
                (t.description ?? "").replace(/^\[Ahorro\]\s*/, "") ||
                t.categories?.name || "Sin descripción"
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                    isIncome ? "bg-green-100" : isSavingTx ? "bg-blue-100" : "bg-red-100"
                  )}>
                    {isIncome
                      ? <TrendingUp className="h-4 w-4 text-green-600" />
                      : isSavingTx
                        ? <PiggyBank className="h-4 w-4 text-blue-600" />
                        : <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(t.date + "T12:00:00"), "dd/MM/yyyy")}
                      {t.categories?.name && !isSavingTx ? ` · ${t.categories.name}` : ""}
                    </p>
                  </div>
                  <span className={cn(
                    "text-sm font-bold shrink-0 tabular-nums",
                    isIncome ? "text-green-600" : isSavingTx ? "text-blue-600" : "text-red-500"
                  )}>
                    {isIncome ? "+" : "−"}{formatCurrency(t.amount, t.currency)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="px-4 py-3 border-t border-slate-50 text-center">
            <Link href="/dashboard/transactions" className="text-xs text-primary font-semibold hover:underline">
              Ver todos los movimientos →
            </Link>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && transactions.length === 0 && (
        <div className="text-center py-14">
          <div className="text-5xl mb-4">📝</div>
          <p className="font-bold text-lg text-slate-700 mb-1">Sin movimientos este mes</p>
          <p className="text-slate-400 text-sm">
            Usá el formulario de arriba o el botón <strong>+</strong> para registrar tu primer movimiento
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Summary card component ───────────────────────────────────────────────────
function SummaryCard({
  label, value, icon, iconBg, valueColor, border, colSpan = 1,
}: {
  label: string; value: string
  icon: React.ReactNode; iconBg: string; valueColor: string; border: string
  colSpan?: 1 | 2
}) {
  return (
    <div className={cn(
      "bg-white rounded-2xl p-4 border shadow-sm",
      border,
      colSpan === 2 && "col-span-2"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", iconBg)}>
          {icon}
        </div>
        <span className="text-xs text-slate-500 font-medium leading-tight">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", valueColor)}>{value}</p>
    </div>
  )
}
