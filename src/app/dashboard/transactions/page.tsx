"use client"

import React, { useState, useMemo, useEffect } from "react"
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
  Plus, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, PiggyBank, Wallet,
  Repeat2, ArrowUp, ArrowDown, Minus, Copy, Check,
  Pencil, Trash2, ChevronDown,
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
  current, prev, currentLabel, prevLabel, displayCurrency, rate, onEdit, onDelete,
}: {
  current: Tx[]; prev: Tx[]
  currentLabel: string; prevLabel: string
  displayCurrency: "ARS" | "USD"; rate: Rate
  onEdit?: (t: Tx) => void
  onDelete?: (id: string) => void
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

  const cellBorder = "border-r border-slate-200 last:border-r-0"
  const ROW = "grid grid-cols-[1fr_112px_112px_68px]"

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
    const cls = { green: "bg-green-600 text-white", red: "bg-red-600 text-white", blue: "bg-blue-600 text-white" }[color]
    const Icon = color === "green" ? TrendingUp : color === "red" ? TrendingDown : PiggyBank
    return (
      <div className={cn("px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2", cls)}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
    )
  }

  function DataRow({ row, type, idx, mode }: {
    row: AggRow; type: "income" | "expense"; idx: number; mode: "income" | "expense"
  }) {
    const [expanded, setExpanded] = useState(false)
    const amtColor = type === "income" ? "text-green-700" : "text-red-600"

    const matchingTxs = current.filter(t => {
      if (mode === "income" && t.type !== "income") return false
      if (mode === "expense" && (t.type !== "expense" || isSavingTransaction(t.description))) return false
      return (t.categories?.name ?? t.description ?? "Sin categoría") === row.key
    })

    const canExpand = matchingTxs.length > 0 && (onEdit || onDelete)
    const bgClass = idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"

    return (
      <>
        <div className={cn(ROW, "border-t border-slate-100", bgClass)}>
          <div
            className={cn("px-4 py-2.5 text-xs text-slate-700 flex items-center gap-1.5", cellBorder, canExpand && "cursor-pointer hover:text-primary")}
            onClick={() => canExpand && setExpanded(e => !e)}
          >
            <span className="flex-1 truncate font-medium">{row.key}</span>
            {canExpand && (
              <ChevronDown className={cn("h-3 w-3 text-slate-400 shrink-0 transition-transform", expanded && "rotate-180")} />
            )}
          </div>
          <div className={cn("px-3 py-2.5 text-right text-xs font-mono font-semibold tabular-nums", amtColor, cellBorder)}>
            {row.curr > 0 ? fmt(row.curr) : <span className="text-slate-300 font-normal">—</span>}
          </div>
          <div className={cn("px-3 py-2.5 text-right text-xs font-mono text-slate-400 tabular-nums", cellBorder)}>
            {row.prev > 0 ? fmt(row.prev) : <span className="text-slate-200">—</span>}
          </div>
          <div className="px-3 py-2.5 flex justify-center items-center">
            <DeltaBadge delta={row.delta} type={type} />
          </div>
        </div>

        {/* Expanded individual transactions */}
        {expanded && matchingTxs.map(t => (
          <div key={t.id} className={cn(ROW, "border-t border-slate-100/60 bg-slate-50")}>
            <div className={cn("pl-8 pr-3 py-2 flex items-center gap-1.5 min-w-0", cellBorder)}>
              <span className="text-xs text-slate-500 truncate flex-1">
                {t.description && !isSavingTransaction(t.description) ? t.description : (t.categories?.name ?? "—")}
              </span>
              <span className="text-xs text-slate-400 shrink-0">
                {format(new Date(t.date + "T12:00:00"), "dd/MM")}
              </span>
              {onEdit && (
                <button
                  onClick={e => { e.stopPropagation(); onEdit(t) }}
                  className="shrink-0 p-0.5 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={e => { e.stopPropagation(); if (window.confirm("¿Eliminar este movimiento?")) onDelete(t.id) }}
                  className="shrink-0 p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className={cn("px-3 py-2 text-right text-xs font-mono tabular-nums font-medium", amtColor, cellBorder)}>
              {formatCurrency(t.amount, t.currency)}
            </div>
            <div className={cn("px-3 py-2", cellBorder)} />
            <div className="px-3 py-2" />
          </div>
        ))}
      </>
    )
  }

  function TotalRow({ label, curr, prev, type }: { label: string; curr: number; prev: number; type: "income" | "expense" }) {
    const delta = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null
    const cls = type === "income"
      ? "bg-green-100 text-green-900 border-t-2 border-green-300"
      : "bg-red-100 text-red-900 border-t-2 border-red-300"
    const amtCls = type === "income" ? "text-green-800" : "text-red-700"
    return (
      <div className={cn(ROW, cls)}>
        <div className={cn("px-4 py-2.5 text-xs font-bold uppercase tracking-wide", cellBorder)}>{label}</div>
        <div className={cn("px-3 py-2.5 text-right font-mono font-bold text-xs tabular-nums", amtCls, cellBorder)}>{fmt(curr)}</div>
        <div className={cn("px-3 py-2.5 text-right font-mono text-xs text-slate-500 font-medium tabular-nums", cellBorder)}>
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
            {incomeRows.map((row, i) => <DataRow key={row.key} row={row} type="income" idx={i} mode="income" />)}
            <TotalRow label="Total ingresos" curr={totalCurrIncome} prev={totalPrevIncome} type="income" />
          </>
        )}

        {/* ── EGRESOS ── */}
        {expenseRows.length > 0 && (
          <>
            <SectionHeader label="Egresos" color="red" />
            {expenseRows.map((row, i) => <DataRow key={row.key} row={row} type="expense" idx={i} mode="expense" />)}
            <TotalRow label="Total egresos" curr={totalCurrExpense} prev={totalPrevExpense} type="expense" />
          </>
        )}

        {/* ── AHORROS ── */}
        {savingRows.length > 0 && (
          <>
            <SectionHeader label="Ahorros" color="blue" />
            {savingRows.map((row, i) => {
              const matchingSavings = current.filter(t =>
                isSavingTransaction(t.description) &&
                ((t.description ?? "").replace(/^\[Ahorro\]\s*/, "") || "Ahorro general") === row.key
              )
              return (
                <SavingRow
                  key={row.key} row={row} idx={i}
                  matchingTxs={matchingSavings}
                  ROW={ROW} cellBorder={cellBorder} fmt={fmt}
                  onEdit={onEdit} onDelete={onDelete}
                />
              )
            })}
            {savingRows.length > 1 && (
              <div className={cn(ROW, "bg-blue-100 border-t-2 border-blue-300 text-blue-900")}>
                <div className={cn("px-4 py-2.5 text-xs font-bold uppercase tracking-wide", cellBorder)}>Total ahorros</div>
                <div className={cn("px-3 py-2.5 text-right font-mono font-bold text-xs tabular-nums text-blue-800", cellBorder)}>{fmt(totalCurrSaving)}</div>
                <div className={cn("px-3 py-2.5 text-right font-mono text-xs text-slate-500 font-medium tabular-nums", cellBorder)}>
                  {totalPrevSaving > 0 ? fmt(totalPrevSaving) : <span className="text-slate-300">—</span>}
                </div>
                <div className="px-3 py-2.5 flex justify-center items-center">
                  <DeltaBadge delta={totalPrevSaving > 0 ? Math.round(((totalCurrSaving - totalPrevSaving) / totalPrevSaving) * 100) : null} type="income" />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SOBRANTE / FALTANTE ── */}
        <div className={cn(ROW, sobrante >= 0 ? "bg-emerald-600" : "bg-orange-500", "text-white")}>
          <div className={cn("px-4 py-3.5 font-bold text-sm flex items-center gap-2", cellBorder)}>
            <Wallet className="h-4 w-4" />
            {sobrante >= 0 ? "SOBRANTE" : "FALTANTE"}
          </div>
          <div className={cn("px-3 py-3.5 text-right font-mono font-bold text-xs tabular-nums", cellBorder)}>
            {fmt(Math.abs(sobrante))}
          </div>
          <div className={cn("px-3 py-3.5 text-right font-mono text-xs font-medium text-white/70 tabular-nums", cellBorder)}>
            {prevSobrante !== 0 ? fmt(Math.abs(prevSobrante)) : "—"}
          </div>
          <div className="px-3 py-3.5 flex justify-center items-center">
            {sobranteDelta !== null && sobranteDelta !== 0 ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-white/20 text-white">
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

// ─── Saving row (expandable, used inside ReciboDeSueldo) ──────────────────────
function SavingRow({ row, idx, matchingTxs, ROW, cellBorder, fmt, onEdit, onDelete }: {
  row: AggRow; idx: number; matchingTxs: Tx[]
  ROW: string; cellBorder: string; fmt: (v: number) => string
  onEdit?: (t: Tx) => void; onDelete?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = matchingTxs.length > 0 && (onEdit || onDelete)
  const bgClass = idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
  return (
    <>
      <div className={cn(ROW, "border-t border-slate-100", bgClass)}>
        <div
          className={cn("px-4 py-2.5 text-xs text-slate-700 flex items-center gap-1.5", cellBorder, canExpand && "cursor-pointer hover:text-primary")}
          onClick={() => canExpand && setExpanded(e => !e)}
        >
          <span className="flex-1 truncate font-medium">{row.key}</span>
          {canExpand && <ChevronDown className={cn("h-3 w-3 text-slate-400 shrink-0 transition-transform", expanded && "rotate-180")} />}
        </div>
        <div className={cn("px-3 py-2.5 text-right font-mono font-semibold text-xs tabular-nums text-blue-700", cellBorder)}>
          {row.curr > 0 ? fmt(row.curr) : <span className="text-slate-300 font-normal">—</span>}
        </div>
        <div className={cn("px-3 py-2.5 text-right font-mono text-xs text-slate-400 tabular-nums", cellBorder)}>
          {row.prev > 0 ? fmt(row.prev) : <span className="text-slate-200">—</span>}
        </div>
        <div className="px-3 py-2.5 flex justify-center items-center">
          <DeltaBadge delta={row.delta} type="income" />
        </div>
      </div>
      {expanded && matchingTxs.map(t => (
        <div key={t.id} className={cn(ROW, "border-t border-slate-100/60 bg-slate-50")}>
          <div className={cn("pl-8 pr-3 py-2 flex items-center gap-1.5 min-w-0", cellBorder)}>
            <span className="text-xs text-slate-500 truncate flex-1">
              {(t.description ?? "").replace(/^\[Ahorro\]\s*/, "") || "Ahorro general"}
            </span>
            <span className="text-xs text-slate-400 shrink-0">{format(new Date(t.date + "T12:00:00"), "dd/MM")}</span>
            {onEdit && (
              <button onClick={e => { e.stopPropagation(); onEdit(t) }} className="shrink-0 p-0.5 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {onDelete && (
              <button onClick={e => { e.stopPropagation(); if (window.confirm("¿Eliminar este movimiento?")) onDelete(t.id) }} className="shrink-0 p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className={cn("px-3 py-2 text-right text-xs font-mono tabular-nums font-medium text-blue-700", cellBorder)}>
            {formatCurrency(t.amount, t.currency)}
          </div>
          <div className={cn("px-3 py-2", cellBorder)} />
          <div className="px-3 py-2" />
        </div>
      ))}
    </>
  )
}

// ─── Annual / histórico view — all months as columns ─────────────────────────
function AnualView({
  userId, displayCurrency, rate,
}: { userId: string; displayCurrency: "ARS" | "USD"; rate: Rate }) {
  const [allTxs, setAllTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from("transactions")
      .select("*, categories(*)")
      .eq("user_id", userId)
      .order("date")
      .then(({ data }) => {
        setAllTxs((data as unknown as Tx[]) ?? [])
        setLoading(false)
      })
  }, [userId])

  const monthGroups = useMemo(() => {
    const groups: Record<string, Tx[]> = {}
    for (const t of allTxs) {
      const mk = t.date.substring(0, 7)
      if (!groups[mk]) groups[mk] = []
      groups[mk].push(t)
    }
    return groups
  }, [allTxs])

  const months = useMemo(() => Object.keys(monthGroups).sort(), [monthGroups])

  const monthData = useMemo(() =>
    months.map(mk => {
      const [y, m] = mk.split("-").map(Number)
      return {
        mk,
        label: format(new Date(y, m - 1, 1), "MMM yy", { locale: es }),
        income:  aggregateTxs(monthGroups[mk] ?? [], "income",  rate, displayCurrency),
        expense: aggregateTxs(monthGroups[mk] ?? [], "expense", rate, displayCurrency),
        saving:  aggregateTxs(monthGroups[mk] ?? [], "saving",  rate, displayCurrency),
      }
    }), [months, monthGroups, rate, displayCurrency]
  )

  const incomeKeys = useMemo(() => {
    const keys = new Set<string>()
    monthData.forEach(d => Object.keys(d.income).forEach(k => keys.add(k)))
    return [...keys].sort((a, b) =>
      monthData.reduce((s, d) => s + (d.income[b] ?? 0), 0) -
      monthData.reduce((s, d) => s + (d.income[a] ?? 0), 0)
    )
  }, [monthData])

  const expenseKeys = useMemo(() => {
    const keys = new Set<string>()
    monthData.forEach(d => Object.keys(d.expense).forEach(k => keys.add(k)))
    return [...keys].sort((a, b) =>
      monthData.reduce((s, d) => s + (d.expense[b] ?? 0), 0) -
      monthData.reduce((s, d) => s + (d.expense[a] ?? 0), 0)
    )
  }, [monthData])

  const savingKeys = useMemo(() => {
    const keys = new Set<string>()
    monthData.forEach(d => Object.keys(d.saving).forEach(k => keys.add(k)))
    return [...keys]
  }, [monthData])

  const currentMk = format(new Date(), "yyyy-MM")
  const fmt = (v: number) => v > 0 ? formatCurrency(v, displayCurrency) : "—"
  const FC = "sticky left-0 z-10 border-r"

  if (loading) return <p className="text-sm text-slate-400 py-10 text-center">Cargando historial...</p>
  if (months.length === 0) return <p className="text-sm text-slate-400 py-10 text-center">Sin datos aún</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="text-sm border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className={cn(FC, "bg-slate-800 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider border-slate-600 min-w-[160px] whitespace-nowrap")}>
              Concepto
            </th>
            {monthData.map(({ mk, label }) => (
              <th key={mk} className={cn(
                "px-3 py-3 text-right text-xs font-bold uppercase border-r border-slate-600 last:border-r-0 capitalize min-w-[104px] whitespace-nowrap",
                mk === currentMk && "bg-slate-600"
              )}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* ── INGRESOS ── */}
          <tr>
            <td colSpan={months.length + 1} className="bg-green-600 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
              ↑ Ingresos
            </td>
          </tr>
          {incomeKeys.map((key, idx) => (
            <tr key={key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className={cn(FC, idx % 2 === 0 ? "bg-white" : "bg-slate-50", "px-4 py-2 text-slate-700 border-slate-100 whitespace-nowrap")}>
                {key}
              </td>
              {monthData.map(({ mk, income }) => (
                <td key={mk} className={cn(
                  "px-3 py-2 text-right font-mono border-r border-slate-100 last:border-r-0 tabular-nums text-xs",
                  income[key] ? "text-green-700 font-semibold" : "text-slate-300",
                  mk === currentMk && "bg-green-50"
                )}>
                  {fmt(income[key] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-green-100 border-t-2 border-green-300">
            <td className={cn(FC, "bg-green-100 px-4 py-2 text-xs font-bold uppercase text-green-900 border-green-200 whitespace-nowrap")}>
              Total ingresos
            </td>
            {monthData.map(({ mk, income }) => {
              const tot = Object.values(income).reduce((s, v) => s + v, 0)
              return (
                <td key={mk} className={cn(
                  "px-3 py-2 text-right font-mono font-bold text-green-800 border-r border-green-200 last:border-r-0 tabular-nums text-xs",
                  mk === currentMk && "bg-green-200/60"
                )}>
                  {fmt(tot)}
                </td>
              )
            })}
          </tr>

          {/* ── EGRESOS ── */}
          {expenseKeys.length > 0 && <>
            <tr>
              <td colSpan={months.length + 1} className="bg-red-600 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
                ↓ Egresos
              </td>
            </tr>
            {expenseKeys.map((key, idx) => (
              <tr key={key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className={cn(FC, idx % 2 === 0 ? "bg-white" : "bg-slate-50", "px-4 py-2 text-slate-700 border-slate-100 whitespace-nowrap")}>
                  {key}
                </td>
                {monthData.map(({ mk, expense }) => (
                  <td key={mk} className={cn(
                    "px-3 py-2 text-right font-mono border-r border-slate-100 last:border-r-0 tabular-nums text-xs",
                    expense[key] ? "text-red-600 font-semibold" : "text-slate-300",
                    mk === currentMk && "bg-red-50"
                  )}>
                    {fmt(expense[key] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-red-100 border-t-2 border-red-300">
              <td className={cn(FC, "bg-red-100 px-4 py-2 text-xs font-bold uppercase text-red-900 border-red-200 whitespace-nowrap")}>
                Total egresos
              </td>
              {monthData.map(({ mk, expense }) => {
                const tot = Object.values(expense).reduce((s, v) => s + v, 0)
                return (
                  <td key={mk} className={cn(
                    "px-3 py-2 text-right font-mono font-bold text-red-800 border-r border-red-200 last:border-r-0 tabular-nums text-xs",
                    mk === currentMk && "bg-red-200/60"
                  )}>
                    {fmt(tot)}
                  </td>
                )
              })}
            </tr>
          </>}

          {/* ── AHORROS ── */}
          {savingKeys.length > 0 && <>
            <tr>
              <td colSpan={months.length + 1} className="bg-blue-600 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
                Ahorros
              </td>
            </tr>
            {savingKeys.map((key, idx) => (
              <tr key={key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className={cn(FC, idx % 2 === 0 ? "bg-white" : "bg-slate-50", "px-4 py-2 text-slate-700 border-slate-100 whitespace-nowrap")}>
                  {key}
                </td>
                {monthData.map(({ mk, saving }) => (
                  <td key={mk} className={cn(
                    "px-3 py-2 text-right font-mono border-r border-slate-100 last:border-r-0 tabular-nums text-xs",
                    saving[key] ? "text-blue-700 font-semibold" : "text-slate-300",
                    mk === currentMk && "bg-blue-50"
                  )}>
                    {fmt(saving[key] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </>}

          {/* ── SOBRANTE ── */}
          <tr className="bg-emerald-600 text-white">
            <td className={cn(FC, "bg-emerald-600 px-4 py-3 font-bold text-sm border-emerald-500 whitespace-nowrap")}>
              💰 Sobrante
            </td>
            {monthData.map(({ mk, income, expense, saving }) => {
              const tI = Object.values(income).reduce((s, v) => s + v, 0)
              const tE = Object.values(expense).reduce((s, v) => s + v, 0)
              const tS = Object.values(saving).reduce((s, v) => s + v, 0)
              const sob = tI - tE - tS
              return (
                <td key={mk} className={cn(
                  "px-3 py-3 text-right font-mono font-bold tabular-nums text-xs border-r border-emerald-500 last:border-r-0",
                  sob < 0 ? "text-red-200" : "text-white",
                  mk === currentMk && "bg-emerald-500"
                )}>
                  {sob < 0 ? "−" : ""}{fmt(Math.abs(sob))}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── CopyRow — single transaction row inside the copy dialog ─────────────────
function CopyRow({
  t, selected, onToggle,
}: { t: Tx; selected: boolean; onToggle: () => void }) {
  const isAhorro = isSavingTransaction(t.description)
  const label =
    (t.description ?? "").replace(/^\[Ahorro\]\s*/, "") ||
    t.categories?.name || "Sin descripción"

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
        selected
          ? "bg-primary/5 border-primary/30"
          : "bg-white border-slate-100 hover:border-slate-200"
      )}
    >
      {/* Checkbox */}
      <div className={cn(
        "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
        selected ? "bg-primary border-primary" : "border-slate-300"
      )}>
        {selected && <Check className="h-3.5 w-3.5 text-white" />}
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {t.categories?.name && !isAhorro && (
          <p className="text-xs text-muted-foreground">{t.categories.name}</p>
        )}
      </div>

      {/* Amount + recurring badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        {t.is_recurring && (
          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
            <Repeat2 className="h-3 w-3" /> fijo
          </span>
        )}
        <span className={cn(
          "text-sm font-bold tabular-nums",
          t.type === "income" ? "text-green-600" : isAhorro ? "text-blue-600" : "text-red-500"
        )}>
          {formatCurrency(t.amount, t.currency)}
        </span>
      </div>
    </button>
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
  const [viewMode, setViewMode] = useState<"mensual" | "anual">("mensual")

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

  // ── Copy-from-prev-month dialog ─────────────────────────────────────────────
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function openCopyDialog() {
    // Pre-select recurring transactions
    const preSelected = new Set(
      prevTransactions.filter(t => t.is_recurring).map(t => t.id)
    )
    setSelectedIds(preSelected)
    setCopyDialogOpen(true)
  }

  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll(ids: string[]) {
    const allSelected = ids.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  async function handleCopySelected() {
    if (!userId || selectedIds.size === 0) return
    setCopying(true)
    const targetDate = format(
      new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
      "yyyy-MM-dd"
    )
    const toCopy = prevTransactions.filter(t => selectedIds.has(t.id))
    await supabase.from("transactions").insert(
      toCopy.map(t => ({
        user_id: userId,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        category_id: t.category_id,
        description: t.description,
        date: targetDate,
        is_recurring: t.is_recurring,
      }))
    )
    setCopying(false)
    setCopyDialogOpen(false)
    setSelectedIds(new Set())
    refresh()
  }

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
            disabled={monthOffset >= 3}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* View mode toggle */}
          <div className="flex gap-1">
            <Button
              variant={viewMode === "mensual" ? "default" : "outline"}
              size="sm" className="h-8 px-3 text-xs"
              onClick={() => setViewMode("mensual")}
            >
              Mensual
            </Button>
            <Button
              variant={viewMode === "anual" ? "default" : "outline"}
              size="sm" className="h-8 px-3 text-xs"
              onClick={() => setViewMode("anual")}
            >
              Histórico
            </Button>
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

          {/* Copy from previous month */}
          <Button
            size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
            onClick={openCopyDialog}
            disabled={prevTransactions.length === 0}
            title="Elegí qué movimientos traer del mes anterior"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar del mes anterior
          </Button>

          {/* Copy dialog */}
          <Dialog open={copyDialogOpen} onOpenChange={o => { setCopyDialogOpen(o); if (!o) setSelectedIds(new Set()) }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar desde {shortPrevMonthLabel} → {shortMonthLabel}
                </DialogTitle>
              </DialogHeader>

              {prevTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay movimientos en el mes anterior</p>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {/* INGRESOS group */}
                  {(() => {
                    const group = prevTransactions.filter(t => t.type === "income")
                    if (!group.length) return null
                    const ids = group.map(t => t.id)
                    const allSel = ids.every(id => selectedIds.has(id))
                    return (
                      <div>
                        <button
                          onClick={() => toggleAll(ids)}
                          className="flex items-center gap-2 w-full px-1 py-1.5 text-xs font-bold uppercase tracking-widest text-green-700 hover:text-green-800 transition-colors"
                        >
                          <div className={cn("h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors", allSel ? "bg-green-500 border-green-500" : "border-slate-300")}>
                            {allSel && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <TrendingUp className="h-3.5 w-3.5" /> Ingresos ({group.length})
                        </button>
                        <div className="space-y-1 mt-1">
                          {group.map(t => (
                            <CopyRow key={t.id} t={t} selected={selectedIds.has(t.id)} onToggle={() => toggleId(t.id)} />
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* EGRESOS group */}
                  {(() => {
                    const group = prevTransactions.filter(t => t.type === "expense" && !isSavingTransaction(t.description))
                    if (!group.length) return null
                    const ids = group.map(t => t.id)
                    const allSel = ids.every(id => selectedIds.has(id))
                    return (
                      <div>
                        <button
                          onClick={() => toggleAll(ids)}
                          className="flex items-center gap-2 w-full px-1 py-1.5 text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors"
                        >
                          <div className={cn("h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors", allSel ? "bg-red-500 border-red-500" : "border-slate-300")}>
                            {allSel && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <TrendingDown className="h-3.5 w-3.5" /> Egresos ({group.length})
                        </button>
                        <div className="space-y-1 mt-1">
                          {group.map(t => (
                            <CopyRow key={t.id} t={t} selected={selectedIds.has(t.id)} onToggle={() => toggleId(t.id)} />
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* AHORROS group */}
                  {(() => {
                    const group = prevTransactions.filter(t => isSavingTransaction(t.description))
                    if (!group.length) return null
                    const ids = group.map(t => t.id)
                    const allSel = ids.every(id => selectedIds.has(id))
                    return (
                      <div>
                        <button
                          onClick={() => toggleAll(ids)}
                          className="flex items-center gap-2 w-full px-1 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <div className={cn("h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors", allSel ? "bg-blue-500 border-blue-500" : "border-slate-300")}>
                            {allSel && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <PiggyBank className="h-3.5 w-3.5" /> Ahorros ({group.length})
                        </button>
                        <div className="space-y-1 mt-1">
                          {group.map(t => (
                            <CopyRow key={t.id} t={t} selected={selectedIds.has(t.id)} onToggle={() => toggleId(t.id)} />
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setCopyDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={selectedIds.size === 0 || copying}
                  onClick={handleCopySelected}
                >
                  <Copy className="h-4 w-4" />
                  {copying ? "Copiando..." : `Copiar ${selectedIds.size} seleccionado${selectedIds.size !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

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
      {viewMode === "anual" ? (
        <AnualView userId={userId} displayCurrency={displayCurrency} rate={rate} />
      ) : loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No hay movimientos para este mes</p>
          </CardContent>
        </Card>
      ) : (
        <ReciboDeSueldo
          current={transactions}
          prev={prevTransactions}
          currentLabel={shortMonthLabel}
          prevLabel={shortPrevMonthLabel}
          displayCurrency={displayCurrency}
          rate={rate}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

