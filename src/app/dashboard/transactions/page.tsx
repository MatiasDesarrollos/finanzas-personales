"use client"

import React, { useState, useMemo } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import {
  useUser,
  useCategories,
  useTransactions,
  useExchangeRate,
  useSavingsGoals,
} from "@/hooks/use-supabase"
import { formatCurrency, convertCurrency } from "@/lib/exchange-rate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  RefreshCw,
  Repeat2,
} from "lucide-react"

const supabase = createClient()

function isSavingTransaction(description: string | null | undefined) {
  return (description ?? "").startsWith("[Ahorro]")
}

export default function TransactionsPage() {
  const userId = useUser()
  const { categories } = useCategories(userId)
  const rate = useExchangeRate()
  const { goals } = useSavingsGoals(userId)

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

  const { transactions, loading, refresh } = useTransactions(userId, currentMonth)

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
    setDescription(isAhorro ? (t.description ?? "").replace(/^\[Ahorro\]\s*/, "") : (t.description ?? ""))
    setDate(t.date)
    setSavingsGoalId("")
    setIsRecurring(t.is_recurring ?? false)
    setDialogOpen(true)
  }

  async function handleCopyRecurring() {
    if (!userId) return
    setCopying(true)
    // Get previous month's recurring transactions
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
      const { data: inserted } = await supabase
        .from("transactions")
        .insert(payload)
        .select("id")
        .single()

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

    // If the saved date belongs to a different month, navigate there automatically
    const savedMonth = date.substring(0, 7) // "yyyy-MM"
    const targetOffset = (() => {
      const [sy, sm] = savedMonth.split("-").map(Number)
      return (sy - now.getFullYear()) * 12 + (sm - 1 - now.getMonth())
    })()
    if (targetOffset !== monthOffset) {
      setMonthOffset(targetOffset)
    } else {
      refresh()
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("transactions").delete().eq("id", id)
    refresh()
  }

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    let savingTotal = 0
    for (const t of transactions) {
      const amt = rate && displayCurrency !== t.currency
        ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
        : t.amount
      if (t.type === "income") {
        income += amt
      } else if (isSavingTransaction(t.description)) {
        savingTotal += amt
      } else {
        expense += amt
      }
    }
    return { income, expense, savingTotal }
  }, [transactions, rate, displayCurrency])

  if (!userId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMonthOffset((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold capitalize">{monthLabel}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonthOffset((p) => p + 1)}
            disabled={monthOffset >= 12}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
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

          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={handleCopyRecurring}
            disabled={copying}
            title="Copia todos los gastos/ingresos fijos del mes anterior a este mes"
          >
            <RefreshCw className={`h-4 w-4 ${copying ? "animate-spin" : ""}`} />
            Copiar fijos
          </Button>

          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
            <DialogTrigger render={<Button size="sm" className="gap-1" />}>
              <Plus className="h-4 w-4" /> Nuevo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Movimiento" : "Nuevo Movimiento"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={type === "income" && !isSaving ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => { setType("income"); setIsSaving(false) }}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" /> Ingreso
                  </Button>
                  <Button
                    variant={type === "expense" && !isSaving ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => { setType("expense"); setIsSaving(false) }}
                  >
                    <TrendingDown className="h-4 w-4 mr-1" /> Gasto
                  </Button>
                  <Button
                    variant={isSaving ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => { setType("expense"); setIsSaving(true) }}
                  >
                    <PiggyBank className="h-4 w-4 mr-1" /> Ahorro
                  </Button>
                </div>

                {isSaving && (
                  <div className="space-y-2">
                    <Label>Objetivo de ahorro (opcional)</Label>
                    <Select value={savingsGoalId} onValueChange={(v) => setSavingsGoalId(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue>
                          {goals.find((g) => g.id === savingsGoalId)?.name ?? "Sin objetivo"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin objetivo</SelectItem>
                        {goals.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select value={currency} onValueChange={(v) => v && setCurrency(v as "ARS" | "USD")}>
                      <SelectTrigger>
                        <SelectValue>{currency}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue>
                        {categories.find((c) => c.id === categoryId)?.name ?? "Seleccionar..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.type === (isSaving ? "expense" : type))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripcion (opcional)</Label>
                  <Textarea
                    placeholder="Detalle del movimiento..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                {!isSaving && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm flex items-center gap-1">
                      <Repeat2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Gasto / ingreso fijo (se puede copiar al mes siguiente)
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(summary.income, displayCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(summary.expense, displayCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Ahorros</p>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(summary.savingTotal, displayCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Sobrante</p>
            <p className={`text-lg font-bold ${(summary.income - summary.expense - summary.savingTotal) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary.income - summary.expense - summary.savingTotal, displayCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No hay movimientos para este mes</p>
          </CardContent>
        </Card>
      ) : (
        <BalanceSheet
          transactions={transactions}
          displayCurrency={displayCurrency}
          rate={rate}
          onEdit={openEdit}
          onDelete={handleDelete}
          summary={summary}
        />
      )}
    </div>
  )
}

// ─── Balance Sheet Component ────────────────────────────────────────────────

type Tx = import("@/types/database").TransactionWithCategory
type Rate = import("@/types/database").ExchangeRate | null

function TxRow({
  t,
  displayCurrency,
  rate,
  onEdit,
  onDelete,
}: {
  t: Tx
  displayCurrency: "ARS" | "USD"
  rate: Rate
  onEdit: (t: Tx) => void
  onDelete: (id: string) => void
}) {
  const isAhorro = isSavingTransaction(t.description)
  const displayDesc =
    isAhorro
      ? (t.description ?? "").replace(/^\[Ahorro\]\s*/, "") || "Ahorro"
      : t.description || t.categories?.name || "Sin descripcion"
  const amt =
    rate && displayCurrency !== t.currency
      ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
      : t.amount
  return (
    <div className="flex items-center justify-between py-2.5 px-3 gap-2 group hover:bg-muted/40 rounded transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate flex items-center gap-1.5">
          {displayDesc}
          {t.is_recurring && (
            <Repeat2 className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Fijo" />
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(t.date), "dd/MM/yyyy")}
          {t.categories?.name ? ` · ${t.categories.name}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span
          className={`text-sm font-semibold tabular-nums ${
            t.type === "income" ? "text-green-600" : isAhorro ? "text-blue-600" : "text-red-600"
          }`}
        >
          {t.type === "income" ? "+" : "−"}
          {formatCurrency(amt, displayCurrency)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onEdit(t)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(t.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function BalanceSheet({
  transactions,
  displayCurrency,
  rate,
  onEdit,
  onDelete,
  summary,
}: {
  transactions: Tx[]
  displayCurrency: "ARS" | "USD"
  rate: Rate
  onEdit: (t: Tx) => void
  onDelete: (id: string) => void
  summary: { income: number; expense: number; savingTotal: number }
}) {
  const incomeRows = transactions.filter((t) => t.type === "income")
  const savingRows = transactions.filter((t) => isSavingTransaction(t.description))
  const expenseRows = transactions.filter(
    (t) => t.type === "expense" && !isSavingTransaction(t.description)
  )

  // Group expenses by category
  const expenseByCategory = useMemo(() => {
    const groups: Record<string, typeof expenseRows> = {}
    for (const t of expenseRows) {
      const cat = t.categories?.name ?? "Sin categoría"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(t)
    }
    // Sort categories by total desc
    return Object.entries(groups).sort(([, a], [, b]) => {
      const sumA = a.reduce((s, t) => s + t.amount, 0)
      const sumB = b.reduce((s, t) => s + t.amount, 0)
      return sumB - sumA
    })
  }, [expenseRows])

  const sobrante = summary.income - summary.expense - summary.savingTotal

  const rowProps = { displayCurrency, rate, onEdit, onDelete }

  return (
    <div className="space-y-4">
      {/* INGRESOS */}
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
            {incomeRows.map((t) => (
              <TxRow key={t.id} t={t} {...rowProps} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* GASTOS */}
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
                  ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
                  : t.amount
                return s + amt
              }, 0)
              return (
                <div key={catName} className="border-b last:border-0">
                  {/* Category sub-header — only show if this category has multiple transactions */}
                  {rows.length > 1 && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40">
                      <span className="text-xs font-semibold text-muted-foreground">{catName}</span>
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                        −{formatCurrency(catTotal, displayCurrency)}
                      </span>
                    </div>
                  )}
                  {rows.map((t) => (
                    <TxRow key={t.id} t={t} {...rowProps} />
                  ))}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* AHORROS */}
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
            {savingRows.map((t) => (
              <TxRow key={t.id} t={t} {...rowProps} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* SOBRANTE */}
      <Card className={`overflow-hidden border-2 ${sobrante >= 0 ? "border-green-400 dark:border-green-600" : "border-red-400 dark:border-red-600"}`}>
        <div className={`flex items-center justify-between px-4 py-3 ${sobrante >= 0 ? "bg-green-50 dark:bg-green-950/40" : "bg-red-50 dark:bg-red-950/40"}`}>
          <span className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${sobrante >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            <Wallet className="h-4 w-4" />
            Sobrante del mes
          </span>
          <span className={`text-xl font-bold tabular-nums ${sobrante >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {sobrante >= 0 ? "+" : "−"}{formatCurrency(Math.abs(sobrante), displayCurrency)}
          </span>
        </div>
      </Card>
    </div>
  )
}
