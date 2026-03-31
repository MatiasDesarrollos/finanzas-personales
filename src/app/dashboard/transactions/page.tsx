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
  CardHeader,
  CardTitle,
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
} from "lucide-react"

const supabase = createClient()

export default function TransactionsPage() {
  const userId = useUser()
  const { categories } = useCategories(userId)
  const rate = useExchangeRate()

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
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS")
  const [categoryId, setCategoryId] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [displayCurrency, setDisplayCurrency] = useState<"ARS" | "USD">("ARS")

  function resetForm() {
    setEditingId(null)
    setType("expense")
    setAmount("")
    setCurrency("ARS")
    setCategoryId("")
    setDescription("")
    setDate(format(new Date(), "yyyy-MM-dd"))
  }

  function openEdit(t: (typeof transactions)[0]) {
    setEditingId(t.id)
    setType(t.type)
    setAmount(String(t.amount))
    setCurrency(t.currency)
    setCategoryId(t.category_id ?? "")
    setDescription(t.description ?? "")
    setDate(t.date)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!userId || !amount || !date) return
    setSaving(true)

    const payload = {
      user_id: userId,
      type,
      amount: parseFloat(amount),
      currency,
      category_id: categoryId || null,
      description: description || null,
      date,
    }

    if (editingId) {
      await supabase.from("transactions").update(payload).eq("id", editingId)
    } else {
      await supabase.from("transactions").insert(payload)
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    refresh()
  }

  async function handleDelete(id: string) {
    await supabase.from("transactions").delete().eq("id", id)
    refresh()
  }

  const filtered = filterType === "all"
    ? transactions
    : transactions.filter((t) => t.type === filterType)

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of transactions) {
      const amt = rate && displayCurrency !== t.currency
        ? convertCurrency(t.amount, t.currency, displayCurrency, rate)
        : t.amount
      if (t.type === "income") income += amt
      else expense += amt
    }
    return { income, expense }
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
            disabled={monthOffset >= 0}
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
                    variant={type === "income" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setType("income")}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" /> Ingreso
                  </Button>
                  <Button
                    variant={type === "expense" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setType("expense")}
                  >
                    <TrendingDown className="h-4 w-4 mr-1" /> Gasto
                  </Button>
                </div>
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
                        <SelectValue />
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
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.type === type)
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
                <Button onClick={handleSave} className="w-full" disabled={saving || !amount}>
                  {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Ingresos del mes</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(summary.income, displayCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Gastos del mes</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(summary.expense, displayCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1">
        {(["all", "income", "expense"] as const).map((f) => (
          <Button
            key={f}
            variant={filterType === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(f)}
          >
            {f === "all" ? "Todos" : f === "income" ? "Ingresos" : "Gastos"}
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
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-3 border-b last:border-0 gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {t.description || t.categories?.name || "Sin descripcion"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.date), "dd/MM/yyyy")} - {t.categories?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={t.type === "income" ? "default" : "destructive"}>
                      {t.type === "income" ? "+" : "-"}
                      {formatCurrency(t.amount, t.currency)}
                    </Badge>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
