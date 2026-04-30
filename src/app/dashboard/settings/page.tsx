"use client"

import { useState, useMemo, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser, useCategories, useBudgets } from "@/hooks/use-supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Plus, Trash2, Settings, Tag, Target, X, User } from "lucide-react"
import { cn } from "@/lib/utils"

const supabase = createClient()
type Tab = "perfil" | "categorias" | "presupuestos"

export default function SettingsPage() {
  const userId = useUser()
  const { categories, refresh: refreshCategories } = useCategories(userId)
  const { budgets, refresh: refreshBudgets, upsertBudget, deleteBudget } = useBudgets(userId)

  const [tab, setTab] = useState<Tab>("perfil")
  const [newCatName, setNewCatName] = useState("")
  const [newCatType, setNewCatType] = useState<"income" | "expense">("expense")
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState({ display_name: "", preferred_currency: "ARS" as "ARS" | "USD" })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Load profile on mount
  useEffect(() => {
    if (!userId || profileLoaded) return
    supabase.from("profiles").select("display_name, preferred_currency").eq("id", userId).single()
      .then(({ data }) => {
        if (data) setProfile({ display_name: data.display_name ?? "", preferred_currency: (data.preferred_currency ?? "ARS") as "ARS" | "USD" })
        setProfileLoaded(true)
      })
  }, [userId, profileLoaded])

  async function handleSaveProfile() {
    if (!userId) return
    setProfileSaving(true)
    await supabase.from("profiles").upsert({ id: userId, display_name: profile.display_name, preferred_currency: profile.preferred_currency })
    setProfileSaving(false)
  }

  // Budget inputs keyed by categoryId
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({})
  const [savingBudget, setSavingBudget] = useState<string | null>(null)

  async function handleAddCategory() {
    if (!userId || !newCatName.trim()) return
    setSaving(true)
    await supabase.from("categories").insert({
      user_id: userId, name: newCatName.trim(), type: newCatType,
    })
    setNewCatName("")
    setSaving(false)
    refreshCategories()
  }

  async function handleDeleteCategory(id: string) {
    await supabase.from("categories").delete().eq("id", id)
    refreshCategories()
  }

  async function handleSaveBudget(categoryId: string) {
    const val = budgetInputs[categoryId]
    if (!val || isNaN(parseFloat(val))) return
    setSavingBudget(categoryId)
    await upsertBudget(categoryId, parseFloat(val))
    setSavingBudget(null)
    setBudgetInputs((p) => { const n = { ...p }; delete n[categoryId]; return n })
    refreshBudgets()
  }

  async function handleDeleteBudget(categoryId: string) {
    await deleteBudget(categoryId)
    refreshBudgets()
  }

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === "expense"), [categories])
  const incomeCategories = useMemo(() => categories.filter((c) => c.type === "income"), [categories])

  const budgetMap = useMemo(() => {
    const m: Record<string, typeof budgets[0]> = {}
    for (const b of budgets) m[b.category_id] = b
    return m
  }, [budgets])

  if (!userId) return null

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "perfil", label: "Perfil", icon: <User className="h-4 w-4" /> },
    { key: "categorias", label: "Categorías", icon: <Tag className="h-4 w-4" /> },
    { key: "presupuestos", label: "Presupuestos", icon: <Target className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Settings className="h-5 w-5" /> Configuración
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── PERFIL ───────────────────────────────── */}
      {tab === "perfil" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Mi Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre para mostrar</Label>
              <Input
                placeholder="Tu nombre"
                value={profile.display_name}
                onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda preferida</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["ARS", "USD"] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setProfile(p => ({ ...p, preferred_currency: c }))}
                    className={`border-2 rounded-xl p-3 text-center transition-all ${
                      profile.preferred_currency === c
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground"
                    }`}
                  >
                    <p className="font-bold">{c}</p>
                    <p className="text-xs text-muted-foreground">{c === "ARS" ? "Pesos argentinos" : "Dólares"}</p>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={profileSaving} className="w-full">
              {profileSaving ? "Guardando..." : "Guardar perfil"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── CATEGORÍAS ───────────────────────────── */}
      {tab === "categorias" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" /> Categorías
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Nombre de categoría"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 min-w-[180px]"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory() }}
              />
              <Select value={newCatType} onValueChange={(v) => v && setNewCatType(v as "income" | "expense")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue>{newCatType === "income" ? "Ingreso" : "Gasto"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddCategory} disabled={saving || !newCatName.trim()} size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-medium mb-2 text-green-600">Ingresos</h3>
              {incomeCategories.length === 0
                ? <p className="text-xs text-muted-foreground">Sin categorías de ingreso</p>
                : <div className="flex flex-wrap gap-2">
                    {incomeCategories.map((c) => (
                      <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
                        {c.name}
                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:text-destructive" onClick={() => handleDeleteCategory(c.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
              }
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2 text-red-600">Gastos</h3>
              {expenseCategories.length === 0
                ? <p className="text-xs text-muted-foreground">Sin categorías de gasto</p>
                : <div className="flex flex-wrap gap-2">
                    {expenseCategories.map((c) => (
                      <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
                        {c.name}
                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:text-destructive" onClick={() => handleDeleteCategory(c.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── PRESUPUESTOS ─────────────────────────── */}
      {tab === "presupuestos" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Presupuestos Mensuales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground mb-4">
              Definí un tope mensual por categoría de gasto. Se visualiza en la sección Movimientos.
            </p>
            {expenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tenés categorías de gasto todavía.</p>
            ) : (
              expenseCategories.map((cat) => {
                const budget = budgetMap[cat.id]
                const inputVal = budgetInputs[cat.id] ?? ""
                const isEditing = cat.id in budgetInputs
                return (
                  <div key={cat.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <span className="text-sm font-medium flex-1">{cat.name}</span>
                    {budget && !isEditing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-28 text-right">
                          <p className="text-sm font-semibold">
                            ${budget.amount.toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-muted-foreground">{budget.currency}/mes</p>
                        </div>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setBudgetInputs((p) => ({ ...p, [cat.id]: String(budget.amount) }))}
                        >
                          Editar
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteBudget(cat.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Ej: 50000"
                          className="w-32 h-8 text-sm"
                          value={inputVal}
                          onChange={(e) => setBudgetInputs((p) => ({ ...p, [cat.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveBudget(cat.id) }}
                          autoFocus={isEditing}
                        />
                        <Button
                          size="sm" className="h-8"
                          onClick={() => handleSaveBudget(cat.id)}
                          disabled={savingBudget === cat.id || !inputVal}
                        >
                          {savingBudget === cat.id ? "..." : "Guardar"}
                        </Button>
                        {isEditing && (
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setBudgetInputs((p) => { const n = { ...p }; delete n[cat.id]; return n })}>
                            ✕
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
