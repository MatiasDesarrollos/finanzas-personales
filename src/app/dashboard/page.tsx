"use client"

import { useMemo, useState, useCallback } from "react"
import { format, addMonths, subMonths, startOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import {
  useUser,
  useTransactions,
  useExchangeRate,
  useMonthlyTotals,
} from "@/hooks/use-supabase"
import { convertCurrency, formatCurrency } from "@/lib/exchange-rate"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Pencil,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategories } from "@/hooks/use-supabase"

const supabase = createClient()

function isSaving(desc: string | null | undefined) {
  return (desc ?? "").startsWith("[Ahorro]")
}

function groupByDay(transactions: any[]) {
  const groups: Record<string, any[]> = {}
  for (const t of transactions) {
    const day = t.date.slice(0, 10)
    if (!groups[day]) groups[day] = []
    groups[day].push(t)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function DashboardPage() {
  const userId = useUser()
  const rate = useExchangeRate()
  const { categories } = useCategories(userId)
  const { data: monthlyData } = useMonthlyTotals(userId)

  // Month navigation
  const [monthOffset, setMonthOffset] = useState(0)
  const currentDate = useMemo(() => addMonths(new Date(), monthOffset), [monthOffset])
  const monthKey = useMemo(() => format(currentDate, "yyyy-MM"), [currentDate])
  const monthLabel = useMemo(() => format(currentDate, "MMMM yyyy", { locale: es }), [currentDate])
  const isCurrentMonth = monthOffset === 0

  const { transactions, loading, refresh } = useTransactions(userId, monthKey)

  // Totals
  const totals = useMemo(() => {
    let income = 0, expense = 0, ahorro = 0
    for (const t of transactions) {
      const amt = rate && t.currency !== "ARS"
        ? convertCurrency(t.amount, t.currency, "ARS", rate)
        : t.amount
      if (t.type === "income") income += amt
      else if (isSaving(t.description)) ahorro += amt
      else expense += amt
    }
    return { income, expense, ahorro, balance: income - expense - ahorro }
  }, [transactions, rate])

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTx, setEditTx] = useState<any>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editCatId, setEditCatId] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  function openEdit(tx: any) {
    setEditTx(tx)
    setEditAmount(String(tx.amount))
    setEditDesc(tx.description ?? "")
    setEditCatId(tx.category_id ?? "")
    setEditOpen(true)
  }

  async function handleEditSave() {
    if (!editTx) return
    setEditSaving(true)
    await supabase.from("transactions").update({
      amount: parseFloat(editAmount),
      description: editDesc || null,
      category_id: editCatId || null,
    }).eq("id", editTx.id)
    setEditSaving(false)
    setEditOpen(false)
    refresh()
  }

  async function handleDelete(id: string) {
    await supabase.from("transactions").delete().eq("id", id)
    refresh()
  }

  const grouped = useMemo(() => groupByDay(transactions), [transactions])
  const todayStr = format(new Date(), "yyyy-MM-dd")
  const yesterdayStr = format(subMonths(new Date(), 0), "yyyy-MM-dd").slice(0, 8) // not needed

  function dayLabel(dateStr: string) {
    if (dateStr === todayStr) return "Hoy"
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd")
    if (dateStr === yesterday) return "Ayer"
    return format(new Date(dateStr + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })
  }

  const expenseCategories = categories.filter(c => c.type === "expense")
  const incomeCategories = categories.filter(c => c.type === "income")

  return (
    <div className="max-w-2xl mx-auto space-y-0">
      {/* Month navigation */}
      <div className="flex items-center justify-between py-4 sticky top-0 bg-background z-10 border-b mb-4">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold capitalize">{monthLabel}</h1>
          {!isCurrentMonth && (
            <button
              onClick={() => setMonthOffset(0)}
              className="text-xs text-primary hover:underline"
            >
              Volver al mes actual
            </button>
          )}
        </div>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          disabled={monthOffset >= 0}
        >
          <ChevronRight className={cn("h-5 w-5", monthOffset >= 0 && "opacity-30")} />
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-2xl p-4 border border-green-100 dark:border-green-900/40">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Gané</span>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-400">
            {formatCurrency(totals.income, "ARS")}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl p-4 border border-red-100 dark:border-red-900/40">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">Gasté</span>
          </div>
          <p className="text-xl font-bold text-red-700 dark:text-red-400">
            {formatCurrency(totals.expense, "ARS")}
          </p>
        </div>

        {totals.ahorro > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center gap-1.5 mb-1">
              <PiggyBank className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Ahorré</span>
            </div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(totals.ahorro, "ARS")}
            </p>
          </div>
        )}

        <div className={cn(
          "rounded-2xl p-4 border col-span-1",
          totals.ahorro > 0 ? "" : "col-span-2",
          totals.balance >= 0
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40"
            : "bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/40"
        )}>
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className={cn("h-4 w-4", totals.balance >= 0 ? "text-emerald-600" : "text-orange-600")} />
            <span className={cn("text-xs font-medium", totals.balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-orange-700 dark:text-orange-400")}>
              {totals.balance >= 0 ? "Me sobra" : "Me falta"}
            </span>
          </div>
          <p className={cn("text-xl font-bold", totals.balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-orange-700 dark:text-orange-400")}>
            {formatCurrency(Math.abs(totals.balance), "ARS")}
          </p>
        </div>
      </div>

      {/* Transactions list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Cargando...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📝</div>
          <p className="font-semibold text-lg mb-1">Sin movimientos este mes</p>
          <p className="text-muted-foreground text-sm">
            Tocá el botón <strong>+</strong> para registrar tu primer gasto o ingreso
          </p>
        </div>
      ) : (
        <div className="space-y-6 pb-32">
          {grouped.map(([dateStr, txs]) => (
            <div key={dateStr}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide capitalize">
                  {dayLabel(dateStr)}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  {txs.reduce((s, t) => {
                    const sign = t.type === "income" ? 1 : -1
                    return s + sign * t.amount
                  }, 0) >= 0 ? "+" : ""}
                  {formatCurrency(Math.abs(txs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0)), "ARS")}
                </span>
              </div>

              {/* Transactions for this day */}
              <div className="space-y-1">
                {txs.map((t: any) => {
                  const isIncome = t.type === "income"
                  const isSavingTx = isSaving(t.description)
                  const label = (t.description ?? "").replace(/^\[Ahorro\]\s*/, "") || t.categories?.name || "Sin descripción"
                  const catName = t.categories?.name

                  return (
                    <div
                      key={t.id}
                      className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      {/* Icon */}
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm",
                        isIncome ? "bg-green-100 dark:bg-green-900/30" :
                        isSavingTx ? "bg-blue-100 dark:bg-blue-900/30" :
                        "bg-red-100 dark:bg-red-900/30"
                      )}>
                        {isIncome ? <TrendingUp className="h-4 w-4 text-green-600" /> :
                         isSavingTx ? <PiggyBank className="h-4 w-4 text-blue-600" /> :
                         <TrendingDown className="h-4 w-4 text-red-600" />}
                      </div>

                      {/* Description + category */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        {catName && !isSavingTx && (
                          <p className="text-xs text-muted-foreground">{catName}</p>
                        )}
                      </div>

                      {/* Amount */}
                      <span className={cn(
                        "text-sm font-bold shrink-0",
                        isIncome ? "text-green-600" :
                        isSavingTx ? "text-blue-600" :
                        "text-red-600"
                      )}>
                        {isIncome ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
                      </span>

                      {/* Edit / Delete — visible on hover */}
                      {!isSavingTx && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <Input
                type="number"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={editCatId} onValueChange={v => setEditCatId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {[...incomeCategories, ...expenseCategories].map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
