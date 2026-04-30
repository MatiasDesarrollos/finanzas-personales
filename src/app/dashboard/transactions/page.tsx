"use client"

import React, { useState, useMemo } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import {
  useUser, useCategories, useTransactions, useExchangeRate, useSavingsGoals,
} from "@/hooks/use-supabase"
import { formatCurrency, convertCurrency } from "@/lib/exchange-rate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, PiggyBank, Wallet,
  RefreshCw, Repeat2, List, BarChart2, ArrowUp, ArrowDown, Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"

const supabase = createClient()

function isSavingTransaction(description: string | null | undefined) {
  return (description ?? "").startsWith("[Ahorro]")
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Tx = import("@/types/database").TransactionWithCategory
type Rate = import("@/types/database").ExchangeRate | null

// ─── Aggregation helpers ──────────────────────────────────────────────────────
function aggregateTxs(
  txs: Tx[],
  mode: "income" | "expense" | "saving",
  rate: Rate,
  displayCurrency: "ARS" | "USD"
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const t of txs) {
    if (mode === "income" && t.type !== "income") continue
    if (mode === "expense" && (t.type !== "expense" || isSavingTransaction(t.description))) continue
    if (mode === "saving" && !isSavingTransaction(t.description)) continue

    const key =
      mode === "saving"
        ? (t.description ?? "").replace(/^\[Ahorro\]\s*/, "") || "Ahorro general"
        : (t.categories?.name ?? t.description ?? "Sin categoría")
    const amt =
      rate && displayCurrency !== t.currency
        ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
        : t.amount
    map[key] = (map[key] ?? 0) + amt
  }
  return map
}

type AggRow = { key: string; curr: number; prev: number; delta: number | null }

function buildRows(currMap: Record<string, number>, prevMap: Record<string, number>): AggRow[] {
  const keys = [...new Set([...Object.keys(currMap), ...Object.keys(prevMap)])]
  return keys
    .map(key => {
      const curr = currMap[key] ?? 0
      const prev = prevMap[key] ?? 0
      const delta = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null
      return { key, curr, prev, delta }
    })
    .sort((a, b) => b.curr - a.curr)
}

// ─── Delta badge ──────────────────────────────────────────────────────────────
function DeltaBadge({ delta, type }: { delta: number | null; type: "income" | "expense" }) {
  if (delta === null) return <span className="text-xs text-slate-300">—</span>
  if (delta === 0)
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500">
        <Minus className="h-3 w-3" /> 0%
      </span>
    )
  const isPositive = delta > 0
  const isGood = type === "income" ? isPositive : !isPositive
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold tabular-nums",
      isGood
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-600"
    )}>
      {isPositive ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />}
      {Math.abs(delta)}%
    </span>
  )
}

// ─── Recibo de sueldo — Excel-style comparison table ─────────────────────────
function ReciboDeSueldo({
  current, prev, currentLabel, prevLabel, displayCurrency, rate,
}: {
  current: Tx[]; prev: Tx[]
  currentLabel: string; prevLabel: string
  displayCurrency: "ARS" | "USD"; rate: Rate
}) {
  const currIncome  = useMemo(() => aggregateTxs(current, "income",  rate, displayCurrency), [current, rate, displayCurrency])
  const prevIncome  = useMemo(() => aggregateTxs(prev,    "income",  rate, displayCurrency), [prev,    rate, displayCurrency])
  const currExpense = useMemo(() => aggregateTxs(current, "expense", rate, displayCurrency), [current, rate, displayCurrency])
  const prevExpense = useMemo(() => aggregateTxs(prev,    "expense", rate, displayCurrency), [prev,    rate, displayCurrency])
  const currSaving  = useMemo(() => aggregateTxs(current, "saving",  rate, displayCurrency), [current, rate, displayCurrency])
  const prevSaving  = useMemo(() => aggregateTxs(prev,    "saving",  rate, displayCurrency), [prev,    rate, displayCurrency])

  const incomeRows  = useMemo(() => buildRows(currIncome,  prevIncome),  [currIncome,  prevIncome])
  const expenseRows = useMemo(() => buildRows(currExpense, prevExpense), [currExpense, prevExpense])
  const savingRows  = useMemo(() => buildRows(currSaving,  prevSaving),  [currSaving,  prevSaving])

  const totalCurrIncome  = incomeRows.reduce((s, r) => s + r.curr, 0)
  const totalPrevIncome  = incomeRows.reduce((s, r) => s + r.prev, 0)
  const totalCurrExpense = expenseRows.reduce((s, r) => s + r.curr, 0)
  const totalPrevExpense = expenseRows.reduce((s, r) => s + r.prev, 0)
  const totalCurrSaving  = savingRows.reduce((s, r) => s + r.curr, 0)
  const totalPrevSaving  = savingRows.reduce((s, r) => s + r.prev, 0)

  const sobrante     = totalCurrIncome - totalCurrExpense - totalCurrSaving
  const prevSobrante = totalPrevIncome - totalPrevExpense - totalPrevSaving
  const sobranteDelta = prevSobrante !== 0
    ? Math.round(((sobrante - prevSobrante) / Math.abs(prevSobrante)) * 100)
    : null

  const fmt = (v: number) => formatCurrency(v, displayCurrency)

  if (current.length === 0 && prev.length === 0)
    return <p className="text-sm text-slate-400 py-12 text-center">Sin datos para comparar</p>

  // Cell border helper
  const cellBorder = "border-r border-slate-200 last:border-r-0"

  // Base row grid
  const ROW = "grid grid-cols-[1fr_120px_120px_72px]"

  function ColHeader() {
    return (
      <div className={cn(ROW, "bg-slate-800 text-white text-xs font-bold uppercase tracking-wider")}>
        <div className={cn("px-4 py-3", cellBorder)}>Concepto</div>
        <div className={cn("px-3 py-3 text-right capitalize", cellBorder)}>{currentLabel}</div>
        <div className={cn("px-3 py-3 text-right capitalize", cellBorder)}>{prevLabel}</div>
        <div className="px-3 py-3 text-center">Δ%</div>
      </div>
    )
  }

  function SectionHeader({ label, color }: { label: string; color: "green" | "red" | "blue" }) {
    const cls = {
      green: "bg-green-600 text-white",
      red:   "bg-red-600   text-white",
      blue:  "bg-blue-600  text-white",
    }[color]
    const Icon = color === "green" ? TrendingUp : color === "red" ? TrendingDown : PiggyBank
    return (
      <div className={cn("px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2", cls)}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
    )
  }

  function DataRow({ row, type, idx }: { row: AggRow; type: "income" | "expense"; idx: number }) {
    const amtColor = type === "income" ? "text-green-700" : "text-red-600"
    return (
      <div className={cn(ROW, "border-t border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
        <div className={cn("px-4 py-2.5 text-sm text-slate-700 truncate", cellBorder)}>{row.key}</div>
        <div className={cn("px-3 py-2.5 text-right text-sm font-mono font-semibold", amtColor, cellBorder)}>
          {row.curr > 0 ? fmt(row.curr) : <span className="text-slate-300 font-normal">—</span>}
        </div>
        <div className={cn("px-3 py-2.5 text-right text-sm font-mono text-slate-400", cellBorder)}>
          {row.prev > 0 ? fmt(row.prev) : <span className="text-slate-200">—</span>}
        </div>
        <div className="px-3 py-2.5 flex justify-center items-center">
          <DeltaBadge delta={row.delta} type={type} />
        </div>
      </div>
    )
  }

  function TotalRow({
    label, curr, prev, type,
  }: { label: string; curr: number; prev: number; type: "income" | "expense" }) {
    const delta = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null
    const cls = type === "income"
      ? "bg-green-100 text-green-900 border-t-2 border-green-300"
      : "bg-red-100   text-red-900   border-t-2 border-red-300"
    const amtCls = type === "income" ? "text-green-800" : "text-red-700"
    return (
      <div className={cn(ROW, cls)}>
        <div className={cn("px-4 py-2.5 text-xs font-bold uppercase tracking-wide", cellBorder)}>{label}</div>
        <div className={cn("px-3 py-2.5 text-right font-mono font-bold text-sm", amtCls, cellBorder)}>{fmt(curr)}</div>
        <div className={cn("px-3 py-2.5 text-right font-mono text-sm text-slate-500 font-medium", cellBorder)}>
          {prev > 0 ? fmt(prev) : <span className="text-slate-300">—</span>}
        </div>
        <div className="px-3 py-2.5 flex justify-center items-center">
          <DeltaBadge delta={delta} type={type} />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <div className="min-w-[460px]">
        <ColHeader />

        {/* ── INGRESOS ── */}
        {incomeRows.length > 0 && (
          <>
            <SectionHeader label="Ingresos" color="green" />
            {incomeRows.map((row, i) => <DataRow key={row.key} row={row} type="income" idx={i} />)}
            <TotalRow label="Total ingresos" curr={totalCurrIncome} prev={totalPrevIncome} type="income" />
          </>
        )}

        {/* ── EGRESOS ── */}
        {expenseRows.length > 0 && (
          <>
            <SectionHeader label="Egresos" color="red" />
            {expenseRows.map((row, i) => <DataRow key={row.key} row={row} type="expense" idx={i} />)}
            <TotalRow label="Total egresos" curr={totalCurrExpense} prev={totalPrevExpense} type="expense" />
          </>
        )}

        {/* ── AHORROS ── */}
        {savingRows.length > 0 && (
          <>
            <SectionHeader label="Ahorros" color="blue" />
            {savingRows.map((row, i) => (
              <div key={row.key} className={cn(ROW, "border-t border-slate-100", i % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                <div className={cn("px-4 py-2.5 text-sm text-slate-700 truncate", cellBorder)}>{row.key}</div>
                <div className={cn("px-3 py-2.5 text-right font-mono font-semibold text-sm text-blue-700", cellBorder)}>
                  {row.curr > 0 ? fmt(row.curr) : <span className="text-slate-300 font-normal">—</span>}
                </div>
                <div className={cn("px-3 py-2.5 text-right font-mono text-sm text-slate-400", cellBorder)}>
                  {row.prev > 0 ? fmt(row.prev) : <span className="text-slate-200">—</span>}
                </div>
                <div className="px-3 py-2.5 flex justify-center items-center">
                  <DeltaBadge delta={row.delta} type="income" />
                </div>
              </div>
            ))}
            {savingRows.length > 1 && (
              <div className={cn(ROW, "bg-blue-100 border-t-2 border-blue-300 text-blue-900")}>
                <div className={cn("px-4 py-2.5 text-xs font-bold uppercase tracking-wide", cellBorder)}>Total ahorros</div>
                <div className={cn("px-3 py-2.5 text-right font-mono font-bold text-sm text-blue-800", cellBorder)}>{fmt(totalCurrSaving)}</div>
                <div className={cn("px-3 py-2.5 text-right font-mono text-sm text-slate-500 font-medium", cellBorder)}>
                  {totalPrevSaving > 0 ? fmt(totalPrevSaving) : <span className="text-slate-300">—</span>}
                </div>
                <div className="px-3 py-2.5 flex justify-center items-center">
                  <DeltaBadge delta={totalPrevSaving > 0 ? Math.round(((totalCurrSaving - totalPrevSaving) / totalPrevSaving) * 100) : null} type="income" />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SOBRANTE / FALTANTE — prominent closing row ── */}
        <div className={cn(
          ROW,
          sobrante >= 0 ? "bg-emerald-600" : "bg-orange-500",
          "text-white"
        )}>
          <div className={cn("px-4 py-4 font-bold text-sm flex items-center gap-2", cellBorder)}>
            <Wallet className="h-4 w-4" />
            {sobrante >= 0 ? "SOBRANTE" : "FALTANTE"}
          </div>
          <div className={cn("px-3 py-4 text-right font-mono font-bold text-base", cellBorder)}>
            {fmt(Math.abs(sobrante))}
          </div>
          <div className={cn("px-3 py-4 text-right font-mono text-sm font-medium text-white/70", cellBorder)}>
            {prevSobrante !== 0 ? fmt(Math.abs(prevSobrante)) : "—"}
          </div>
          <div className="px-3 py-4 flex justify-center items-center">
            {sobranteDelta !== null && sobranteDelta !== 0 ? (
              <span className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold",
                "bg-white/20 text-white"
              )}>
                {sobranteDelta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(sobranteDelta)}%
              </span>
            ) : sobranteDelta === 0 ? (
              <span className="text-xs text-white/60">= 0%</span>
            ) : (
              <span className="text-xs text-white/40">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const userId = useUser()
  const { categories } = useCategories(userId)
  const rate = useExchangeRate()
  const { goals } = useSavingsGoals(userId)

  const now = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const [view, setView] = useState<"lista" | "recibo">("lista")

  const currentMonth = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    return format(d, "yyyy-MM")
  }, [monthOffset])

  const monthLabel = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    return format(d, "MMMM yyyy", { locale: es })
  }, [monthOffset])

  const shortMonthLabel = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    return format(d, "MMM yy", { locale: es })
  }, [monthOffset])

  // Previous month (always loaded for comparison view)
  const prevMonthKey = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number)
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
  }, [currentMonth])

  const shortPrevMonthLabel = useMemo(() => {
    const [y, m] = prevMonthKey.split("-").map(Number)
    return format(new Date(y, m - 1, 1), "MMM yy", { locale: es })
  }, [prevMonthKey])

  const { transactions, loading, refresh } = useTransactions(userId, currentMonth)
  const { transactions: prevTransactions } = useTransactions(userId, prevMonthKey)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [type, setType] = useState<"income" | "expense">("expense")
  const [isSaving, setIsSaving] = useState(false)
  const [savingsGoalId, setSavingsGoalId] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS")
  const [categoryId, setCategoryId] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [saving, setSaving] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [displayCurrency, setDisplayCurrency] = useState<"ARS" | "USD">("ARS")
  const [copying, setCopying] = useState(false)

  function resetForm() {
    setEditingId(null)
    setType("expense")
    setIsSaving(false)
    setSavingsGoalId("")
    setIsRecurring(false)
    setAmount("")
    setCurrency("ARS")
    setCategoryId("")
    setDescription("")
    setDate(format(new Date(), "yyyy-MM-dd"))
  }

  function openEdit(t: (typeof transactions)[0]) {
    setEditingId(t.id)
    const isAhorro = isSavingTransaction(t.description)
    setIsSaving(isAhorro)
    setType(isAhorro ? "expense" : (t.type as "income" | "expense"))
    setAmount(String(t.amount))
    setCurrency(t.currency)
    setCategoryId(t.category_id ?? "")
    setDescription(
      isAhorro
        ? (t.description ?? "").replace(/^\[Ahorro\]\s*/, "")
        : (t.description ?? "")
    )
    setDate(t.date)
    setSavingsGoalId("")
    setIsRecurring(t.is_recurring ?? false)
    setDialogOpen(true)
  }

  async function handleCopyRecurring() {
    if (!userId) return
    setCopying(true)
    const prevMonth = format(
      new Date(now.getFullYear(), now.getMonth() + monthOffset - 1, 1),
      "yyyy-MM"
    )
    const { data: recurringTxs } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_recurring", true)
      .gte("date", `${prevMonth}-01`)
      .lt("date", (() => {
        const [y, m] = prevMonth.split("-").map(Number)
        return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`
      })())

    if (recurringTxs && recurringTxs.length > 0) {
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
      const newTxs = recurringTxs.map((t) => ({
        user_id: userId,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        category_id: t.category_id,
        description: t.description,
        date: format(targetMonthDate, "yyyy-MM-dd"),
        is_recurring: true,
      }))
      await supabase.from("transactions").insert(newTxs)
      refresh()
    }
    setCopying(false)
  }

  async function handleSave() {
    if (!userId || !amount || !date) return
    setSaving(true)

    const descriptionValue = isSaving
      ? `[Ahorro] ${description}`.trimEnd()
      : description || null

    const payload = {
      user_id: userId,
      type: isSaving ? "expense" : type,
      amount: parseFloat(amount),
      currency,
      category_id: categoryId || null,
      description: descriptionValue,
      date,
      is_recurring: isRecurring,
    }

    if (editingId) {
      await supabase.from("transactions").update(payload).eq("id", editingId)
    } else {
      await supabase.from("transactions").insert(payload).select("id").single()
      if (isSaving && savingsGoalId) {
        await supabase.from("savings_contributions").insert({
          user_id: userId,
          goal_id: savingsGoalId,
          amount: parseFloat(amount),
          currency,
          date,
        })
      }
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()

    const savedMonth = date.substring(0, 7)
    const targetOffset = (() => {
      const [sy, sm] = savedMonth.split("-").map(Number)
      return (sy - now.getFullYear()) * 12 + (sm - 1 - now.getMonth())
    })()
    if (targetOffset !== monthOffset) setMonthOffset(targetOffset)
    else refresh()
  }

  async function handleDelete(id: string) {
    await supabase.from("transactions").delete().eq("id", id)
    refresh()
  }

  const summary = useMemo(() => {
    let income = 0, expense = 0, savingTotal = 0
    for (const t of transactions) {
      const amt =
        rate && displayCurrency !== t.currency
          ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
          : t.amount
      if (t.type === "income") income += amt
      else if (isSavingTransaction(t.description)) savingTotal += amt
      else expense += amt
    }
    return { income, expense, savingTotal }
  }, [transactions, rate, displayCurrency])

  if (!userId) return null

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Month navigator */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold capitalize min-w-[140px] text-center">{monthLabel}</h1>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setMonthOffset(p => p + 1)}
            disabled={monthOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setView("lista")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                view === "lista"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              onClick={() => setView("recibo")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l transition-colors",
                view === "recibo"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <BarChart2 className="h-3.5 w-3.5" /> Recibo
            </button>
          </div>

          {/* Currency toggle */}
          <div className="flex gap-1">
            <Button variant={displayCurrency === "ARS" ? "default" : "outline"} size="sm" className="h-8 px-3 text-xs" onClick={() => setDisplayCurrency("ARS")}>
              ARS
            </Button>
            <Button variant={displayCurrency === "USD" ? "default" : "outline"} size="sm" className="h-8 px-3 text-xs" onClick={() => setDisplayCurrency("USD")}>
              USD
            </Button>
          </div>

          {/* Copy recurring */}
          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={handleCopyRecurring} disabled={copying} title="Copia gastos/ingresos fijos del mes anterior">
            <RefreshCw className={cn("h-3.5 w-3.5", copying && "animate-spin")} />
            Copiar fijos
          </Button>

          {/* New transaction */}
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
            <DialogTrigger render={<Button size="sm" className="gap-1 h-8 text-xs" />}>
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Movimiento" : "Nuevo Movimiento"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant={type === "income" && !isSaving ? "default" : "outline"} className="flex-1" onClick={() => { setType("income"); setIsSaving(false) }}>
                    <TrendingUp className="h-4 w-4 mr-1" /> Ingreso
                  </Button>
                  <Button variant={type === "expense" && !isSaving ? "default" : "outline"} className="flex-1" onClick={() => { setType("expense"); setIsSaving(false) }}>
                    <TrendingDown className="h-4 w-4 mr-1" /> Gasto
                  </Button>
                  <Button variant={isSaving ? "default" : "outline"} className="flex-1" onClick={() => { setType("expense"); setIsSaving(true) }}>
                    <PiggyBank className="h-4 w-4 mr-1" /> Ahorro
                  </Button>
                </div>

                {isSaving && (
                  <div className="space-y-2">
                    <Label>Objetivo de ahorro (opcional)</Label>
                    <Select value={savingsGoalId} onValueChange={v => setSavingsGoalId(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue>{goals.find(g => g.id === savingsGoalId)?.name ?? "Sin objetivo"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin objetivo</SelectItem>
                        {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monto</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select value={currency} onValueChange={v => v && setCurrency(v as "ARS" | "USD")}>
                      <SelectTrigger><SelectValue>{currency}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={categoryId} onValueChange={v => setCategoryId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue>{categories.find(c => c.id === categoryId)?.name ?? "Seleccionar..."}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.type === (isSaving ? "expense" : type)).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Descripción (opcional)</Label>
                  <Textarea placeholder="Detalle del movimiento..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                {!isSaving && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-border accent-primary" />
                    <span className="text-sm flex items-center gap-1">
                      <Repeat2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Gasto / ingreso fijo
                    </span>
                  </label>
                )}

                <Button onClick={handleSave} className="w-full" disabled={saving || !amount}>
                  {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ingresos",  value: summary.income,      color: "text-green-600" },
          { label: "Gastos",    value: summary.expense,     color: "text-red-600"   },
          { label: "Ahorros",   value: summary.savingTotal, color: "text-blue-600"  },
          { label: "Sobrante",  value: summary.income - summary.expense - summary.savingTotal,
            color: (summary.income - summary.expense - summary.savingTotal) >= 0 ? "text-green-600" : "text-red-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-lg font-bold tabular-nums", color)}>
                {formatCurrency(value, displayCurrency)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
      ) : transactions.length === 0 && view === "lista" ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No hay movimientos para este mes</p>
          </CardContent>
        </Card>
      ) : view === "lista" ? (
        <BalanceSheet
          transactions={transactions}
          displayCurrency={displayCurrency}
          rate={rate}
          onEdit={openEdit}
          onDelete={handleDelete}
          summary={summary}
        />
      ) : (
        <ReciboDeSueldo
          current={transactions}
          prev={prevTransactions}
          currentLabel={shortMonthLabel}
          prevLabel={shortPrevMonthLabel}
          displayCurrency={displayCurrency}
          rate={rate}
        />
      )}
    </div>
  )
}

// ─── Balance Sheet (Lista view) ───────────────────────────────────────────────
function TxRow({
  t, displayCurrency, rate, onEdit, onDelete,
}: {
  t: Tx; displayCurrency: "ARS" | "USD"; rate: Rate
  onEdit: (t: Tx) => void; onDelete: (id: string) => void
}) {
  const isAhorro = isSavingTransaction(t.description)
  const displayDesc =
    isAhorro
      ? (t.description ?? "").replace(/^\[Ahorro\]\s*/, "") || "Ahorro"
      : t.description || t.categories?.name || "Sin descripción"
  const amt =
    rate && displayCurrency !== t.currency
      ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
      : t.amount

  return (
    <div className="flex items-center justify-between py-2.5 px-3 gap-2 group hover:bg-muted/40 rounded transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate flex items-center gap-1.5">
          {displayDesc}
          {t.is_recurring && <Repeat2 className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Fijo" />}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(t.date), "dd/MM/yyyy")}
          {t.categories?.name ? ` · ${t.categories.name}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          t.type === "income" ? "text-green-600" : isAhorro ? "text-blue-600" : "text-red-600"
        )}>
          {t.type === "income" ? "+" : "−"}{formatCurrency(amt, displayCurrency)}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onEdit(t)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(t.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function BalanceSheet({
  transactions, displayCurrency, rate, onEdit, onDelete, summary,
}: {
  transactions: Tx[]; displayCurrency: "ARS" | "USD"; rate: Rate
  onEdit: (t: Tx) => void; onDelete: (id: string) => void
  summary: { income: number; expense: number; savingTotal: number }
}) {
  const incomeRows  = transactions.filter(t => t.type === "income")
  const savingRows  = transactions.filter(t => isSavingTransaction(t.description))
  const expenseRows = transactions.filter(t => t.type === "expense" && !isSavingTransaction(t.description))

  const expenseByCategory = useMemo(() => {
    const groups: Record<string, typeof expenseRows> = {}
    for (const t of expenseRows) {
      const cat = t.categories?.name ?? "Sin categoría"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(t)
    }
    return Object.entries(groups).sort(([, a], [, b]) => {
      return b.reduce((s, t) => s + t.amount, 0) - a.reduce((s, t) => s + t.amount, 0)
    })
  }, [expenseRows])

  const sobrante = summary.income - summary.expense - summary.savingTotal
  const rowProps = { displayCurrency, rate, onEdit, onDelete }

  return (
    <div className="space-y-4">
      {incomeRows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-800 flex items-center justify-between px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Ingresos
            </span>
            <span className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">
              +{formatCurrency(summary.income, displayCurrency)}
            </span>
          </div>
          <CardContent className="p-0">
            {incomeRows.map(t => <TxRow key={t.id} t={t} {...rowProps} />)}
          </CardContent>
        </Card>
      )}

      {expenseRows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 flex items-center justify-between px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" /> Gastos
            </span>
            <span className="text-sm font-bold text-red-700 dark:text-red-400 tabular-nums">
              −{formatCurrency(summary.expense, displayCurrency)}
            </span>
          </div>
          <CardContent className="p-0">
            {expenseByCategory.map(([catName, rows]) => {
              const catTotal = rows.reduce((s, t) => {
                const amt = rate && displayCurrency !== t.currency
                  ? convertCurrency(t.amount, t.currency, displayCurrency, rate) : t.amount
                return s + amt
              }, 0)
              return (
                <div key={catName} className="border-b last:border-0">
                  {rows.length > 1 && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40">
                      <span className="text-xs font-semibold text-muted-foreground">{catName}</span>
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                        −{formatCurrency(catTotal, displayCurrency)}
                      </span>
                    </div>
                  )}
                  {rows.map(t => <TxRow key={t.id} t={t} {...rowProps} />)}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {savingRows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <PiggyBank className="h-3.5 w-3.5" /> Ahorros
            </span>
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums">
              −{formatCurrency(summary.savingTotal, displayCurrency)}
            </span>
          </div>
          <CardContent className="p-0">
            {savingRows.map(t => <TxRow key={t.id} t={t} {...rowProps} />)}
          </CardContent>
        </Card>
      )}

      <Card className={cn("overflow-hidden border-2", sobrante >= 0 ? "border-green-400 dark:border-green-600" : "border-red-400 dark:border-red-600")}>
        <div className={cn("flex items-center justify-between px-4 py-3", sobrante >= 0 ? "bg-green-50 dark:bg-green-950/40" : "bg-red-50 dark:bg-red-950/40")}>
          <span className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2", sobrante >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
            <Wallet className="h-4 w-4" /> Sobrante del mes
          </span>
          <span className={cn("text-xl font-bold tabular-nums", sobrante >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
            {sobrante >= 0 ? "+" : "−"}{formatCurrency(Math.abs(sobrante), displayCurrency)}
          </span>
        </div>
      </Card>
    </div>
  )
}
