"use client"

import { useState, useMemo } from "react"
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
import { Badge } from "@/components/ui/badge"
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
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "saving">("all")
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

  const filtered = useMemo(() => {
    if (filterType === "all") return transactions
    if (filterType === "saving") return transactions.filter((t) => isSavingTransaction(t.description))
    if (filterType === "income") return transactions.filter((t) => t.type === "income")
    return transactions.filter((t) => t.type === "expense" && !isSavingTransaction(t.description))
  }, [transactions, filterType])

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

      <div className="flex gap-1">
        {(["all", "income", "expense", "saving"] as const).map((f) => (
          <Button
            key={f}
            variant={filterType === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(f)}
          >
            {f === "all" ? "Todos" : f === "income" ? "Ingresos" : f === "expense" ? "Gastos" : "Ahorros"}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay movimientos para este mes
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((t) => {
                const isAhorro = isSavingTransaction(t.description)
                const displayDesc = isAhorro
                  ? (t.description ?? "").replace(/^\[Ahorro\]\s*/, "") || t.categories?.name || "Ahorro"
                  : t.description || t.categories?.name || "Sin descripcion"
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-3 border-b last:border-0 gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate flex items-center gap-1">
                        {displayDesc}
                        {t.is_recurring && (
                          <Repeat2 className="h-3 w-3 text-muted-foreground shrink-0" title="Gasto fijo" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.date), "dd/MM/yyyy")} - {t.categories?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAhorro ? (
                        <Badge variant="outline" className="border-cyan-500 text-cyan-600">
                          <PiggyBank className="h-3 w-3 mr-1" />
                          Ahorro {formatCurrency(t.amount, t.currency)}
                        </Badge>
                      ) : (
                        <Badge variant={t.type === "income" ? "default" : "destructive"}>
                          {t.type === "income" ? "+" : "-"}
                          {formatCurrency(t.amount, t.currency)}
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
