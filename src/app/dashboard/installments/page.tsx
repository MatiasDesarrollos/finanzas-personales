"use client"

import { useState, useMemo } from "react"
import { format, addMonths, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { useUser, useInstallments, useCategories, useExchangeRate } from "@/hooks/use-supabase"
import { formatCurrency, convertCurrency } from "@/lib/exchange-rate"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { CreditCard, Plus, Trash2, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react"

const supabase = createClient()

export default function InstallmentsPage() {
  const userId = useUser()
  const rate = useExchangeRate()
  const { installments, loading, refresh } = useInstallments(userId)
  const { categories } = useCategories(userId)
  const expenseCategories = categories.filter(c => c.type === "expense")

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: "",
    installment_amount: "",
    total_installments: "",
    paid_installments: "0",
    currency: "ARS" as "ARS" | "USD",
    start_date: format(new Date(), "yyyy-MM-dd"),
    category_id: "",
  })

  function setField(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!userId || !form.description || !form.installment_amount || !form.total_installments) return
    setSaving(true)
    const installmentAmt = parseFloat(form.installment_amount)
    const total = parseInt(form.total_installments)
    const paid = parseInt(form.paid_installments) || 0
    await supabase.from("installments").insert({
      user_id: userId,
      description: form.description,
      installment_amount: installmentAmt,
      total_amount: installmentAmt * total,
      total_installments: total,
      paid_installments: paid,
      currency: form.currency,
      start_date: form.start_date,
      category_id: form.category_id || null,
    })
    refresh()
    setOpen(false)
    setForm({ description: "", installment_amount: "", total_installments: "", paid_installments: "0", currency: "ARS", start_date: format(new Date(), "yyyy-MM-dd"), category_id: "" })
    setSaving(false)
  }

  async function handlePay(id: string, current: number) {
    await supabase.from("installments").update({ paid_installments: current + 1 }).eq("id", id)
    refresh()
  }

  async function handleDelete(id: string) {
    await supabase.from("installments").delete().eq("id", id)
    refresh()
  }

  // Summary: total monthly commitment
  const monthlyCommitment = useMemo(() => {
    return installments
      .filter(i => i.paid_installments < i.total_installments)
      .reduce((sum, i) => {
        const amt = rate && i.currency !== "ARS"
          ? convertCurrency(i.installment_amount, i.currency, "ARS", rate)
          : i.installment_amount
        return sum + amt
      }, 0)
  }, [installments, rate])

  const active = installments.filter(i => i.paid_installments < i.total_installments)
  const completed = installments.filter(i => i.paid_installments >= i.total_installments)

  if (!userId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5" /> Cuotas y Deudas
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" /> Nueva cuota
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nueva cuota / deuda</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input placeholder="Ej: Lavarropas Samsung, Tarjeta Visa..." value={form.description} onChange={e => setField("description", e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor de cada cuota</Label>
                  <Input type="number" min={0} placeholder="0" value={form.installment_amount} onChange={e => setField("installment_amount", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <Select value={form.currency} onValueChange={v => v && setField("currency", v)}>
                    <SelectTrigger><SelectValue>{form.currency}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Total de cuotas</Label>
                  <Input type="number" min={1} placeholder="12" value={form.total_installments} onChange={e => setField("total_installments", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cuotas ya pagadas</Label>
                  <Input type="number" min={0} placeholder="0" value={form.paid_installments} onChange={e => setField("paid_installments", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Fecha de inicio</Label>
                  <Input type="date" value={form.start_date} onChange={e => setField("start_date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría (opcional)</Label>
                  <Select value={form.category_id} onValueChange={v => setField("category_id", v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
                <Button onClick={handleSave} disabled={saving || !form.description || !form.installment_amount || !form.total_installments}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly commitment summary */}
      {active.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Compromiso mensual en cuotas
                </p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(monthlyCommitment, "ARS")}
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                  {active.length} cuota{active.length !== 1 ? "s" : ""} activa{active.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : active.length === 0 && completed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <CreditCard className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Sin cuotas registradas</p>
            <p className="text-sm text-muted-foreground mt-1">Registrá tus compras en cuotas para saber cuánto comprometés cada mes</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active installments */}
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Activas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map(inst => {
                  const pct = Math.round((inst.paid_installments / inst.total_installments) * 100)
                  const remaining = inst.total_installments - inst.paid_installments
                  const nextDate = addMonths(parseISO(inst.start_date), inst.paid_installments)
                  return (
                    <Card key={inst.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm font-semibold">{inst.description}</CardTitle>
                            {inst.categories && (
                              <Badge variant="secondary" className="mt-1 text-xs">{inst.categories.name}</Badge>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-bold">{formatCurrency(inst.installment_amount, inst.currency)}</p>
                            <p className="text-xs text-muted-foreground">por mes</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Cuota {inst.paid_installments + 1} de {inst.total_installments}</span>
                            <span>{pct}% pagado</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" />
                            Próxima: {format(nextDate, "MMM yyyy", { locale: es })}
                          </span>
                          <span>{remaining} cuota{remaining !== 1 ? "s" : ""} restante{remaining !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs h-8" onClick={() => handlePay(inst.id, inst.paid_installments)}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Marcar pagada
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(inst.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Completadas</h2>
              <div className="space-y-2">
                {completed.map(inst => (
                  <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 opacity-70">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{inst.description}</span>
                      <span className="text-xs text-muted-foreground">({inst.total_installments} cuotas)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{formatCurrency(inst.total_amount, inst.currency)}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(inst.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
