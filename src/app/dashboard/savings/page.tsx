"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import {
  useUser,
  useSavingsGoals,
  useExchangeRate,
} from "@/hooks/use-supabase"
import { formatCurrency, convertCurrency } from "@/lib/exchange-rate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Plus, PiggyBank, Trash2, Target, X, ChevronDown, ChevronRight, Pencil } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { format as fmtDate } from "date-fns"

const supabase = createClient()

export default function SavingsPage() {
  const userId = useUser()
  const { goals, loading, refresh } = useSavingsGoals(userId)
  const rate = useExchangeRate()
  const [displayCurrency, setDisplayCurrency] = useState<"ARS" | "USD">("ARS")

  // Goal form (create or edit)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [goalName, setGoalName] = useState("")
  const [goalTarget, setGoalTarget] = useState("")
  const [goalCurrency, setGoalCurrency] = useState<"ARS" | "USD">("ARS")
  const [goalDeadline, setGoalDeadline] = useState("")
  const [savingGoal, setSavingGoal] = useState(false)

  // Contribution form — keyed by goalId
  const [contribGoalId, setContribGoalId] = useState<string | null>(null)
  const [contribAmount, setContribAmount] = useState("")
  const [contribCurrency, setContribCurrency] = useState<"ARS" | "USD">("ARS")
  const [contribConcept, setContribConcept] = useState("")
  const [contribDate, setContribDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [savingContrib, setSavingContrib] = useState(false)

  // Collapsed concepts per goal: { [goalId]: Set<concept> }
  const [collapsedConcepts, setCollapsedConcepts] = useState<Record<string, Set<string>>>({})

  function openNewGoal() {
    setEditingGoalId(null)
    setGoalName("")
    setGoalTarget("")
    setGoalCurrency("ARS")
    setGoalDeadline("")
    setGoalDialogOpen(true)
  }

  function openEditGoal(goal: (typeof goals)[0]) {
    setEditingGoalId(goal.id)
    setGoalName(goal.name)
    setGoalTarget(String(goal.target_amount))
    setGoalCurrency(goal.currency)
    setGoalDeadline(goal.deadline ?? "")
    setGoalDialogOpen(true)
  }

  async function handleSaveGoal() {
    if (!userId || !goalName || !goalTarget) return
    setSavingGoal(true)
    const payload = {
      name: goalName,
      target_amount: parseFloat(goalTarget),
      currency: goalCurrency,
      deadline: goalDeadline || null,
    }
    if (editingGoalId) {
      await supabase.from("savings_goals").update(payload).eq("id", editingGoalId)
    } else {
      await supabase.from("savings_goals").insert({ user_id: userId, ...payload })
    }
    setSavingGoal(false)
    setGoalDialogOpen(false)
    refresh()
  }

  async function handleAddContribution() {
    if (!userId || !contribGoalId || !contribAmount) return
    setSavingContrib(true)
    await supabase.from("savings_contributions").insert({
      user_id: userId,
      goal_id: contribGoalId,
      amount: parseFloat(contribAmount),
      currency: contribCurrency,
      concept: contribConcept.trim() || null,
      date: contribDate,
    })
    setSavingContrib(false)
    setContribGoalId(null)
    setContribAmount("")
    setContribConcept("")
    setContribDate(format(new Date(), "yyyy-MM-dd"))
    refresh()
  }

  async function handleDeleteGoal(id: string) {
    await supabase.from("savings_goals").delete().eq("id", id)
    refresh()
  }

  async function handleDeleteContribution(id: string) {
    await supabase.from("savings_contributions").delete().eq("id", id)
    refresh()
  }

  function toggleConcept(goalId: string, concept: string) {
    setCollapsedConcepts((prev) => {
      const set = new Set(prev[goalId] ?? [])
      if (set.has(concept)) set.delete(concept)
      else set.add(concept)
      return { ...prev, [goalId]: set }
    })
  }

  function getCumulativeData(goal: (typeof goals)[0]) {
    const sorted = [...goal.savings_contributions].sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    let acc = 0
    return sorted.map((c) => {
      const amount =
        rate && c.currency !== goal.currency
          ? convertCurrency(c.amount, c.currency, goal.currency, rate)
          : c.amount
      acc += amount
      return {
        fecha: fmtDate(new Date(c.date), "dd/MM/yy"),
        acumulado: Math.round(acc),
      }
    })
  }

  function getGoalProgress(goal: (typeof goals)[0]) {
    let totalSaved = 0
    for (const c of goal.savings_contributions) {
      const amount =
        rate && c.currency !== goal.currency
          ? convertCurrency(c.amount, c.currency, goal.currency, rate)
          : c.amount
      totalSaved += amount
    }
    const pct = goal.target_amount > 0
      ? Math.min((totalSaved / goal.target_amount) * 100, 100)
      : 0
    return { totalSaved, pct }
  }

  // Group contributions by concept for a goal
  function groupByConcept(goal: (typeof goals)[0]) {
    const groups: Record<string, typeof goal.savings_contributions> = {}
    for (const c of goal.savings_contributions) {
      const key = c.concept ?? ""
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    // Sort each group by date desc
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => b.date.localeCompare(a.date))
    }
    // Sort group keys: named concepts first (alpha), then "" (sin concepto) last
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === "" && b !== "") return 1
      if (a !== "" && b === "") return -1
      return a.localeCompare(b)
    })
  }

  // Get unique concept names for a goal (for datalist suggestions)
  function getConceptSuggestions(goalId: string) {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return []
    const names = new Set<string>()
    for (const c of goal.savings_contributions) {
      if (c.concept) names.add(c.concept)
    }
    return Array.from(names).sort()
  }

  const totalAllSaved = useMemo(() => {
    let total = 0
    for (const g of goals) {
      for (const c of g.savings_contributions) {
        const amount =
          rate && displayCurrency !== c.currency
            ? convertCurrency(c.amount, c.currency, displayCurrency, rate)
            : c.amount
        total += amount
      }
    }
    return total
  }, [goals, rate, displayCurrency])

  if (!userId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <PiggyBank className="h-5 w-5" /> Objetivos de Ahorro
        </h1>
        <div className="flex gap-2">
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

          <Button size="sm" className="gap-1" onClick={openNewGoal}>
            <Plus className="h-4 w-4" /> Nuevo Objetivo
          </Button>

          <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGoalId ? "Editar Objetivo" : "Nuevo Objetivo de Ahorro"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    placeholder="Ej: Vacaciones, Auto, etc."
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monto Objetivo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select
                      value={goalCurrency}
                      onValueChange={(v) => v && setGoalCurrency(v as "ARS" | "USD")}
                    >
                      <SelectTrigger>
                        <SelectValue>{goalCurrency}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fecha limite (opcional)</Label>
                  <Input
                    type="date"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSaveGoal}
                  className="w-full"
                  disabled={savingGoal || !goalName || !goalTarget}
                >
                  {savingGoal
                    ? "Guardando..."
                    : editingGoalId
                    ? "Guardar cambios"
                    : "Crear Objetivo"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total ahorrado</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(totalAllSaved, displayCurrency)}
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No tenes objetivos de ahorro todavia
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea uno para empezar a ahorrar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const { totalSaved, pct } = getGoalProgress(goal)
            const displaySaved =
              rate && displayCurrency !== goal.currency
                ? convertCurrency(totalSaved, goal.currency, displayCurrency, rate)
                : totalSaved
            const displayTarget =
              rate && displayCurrency !== goal.currency
                ? convertCurrency(goal.target_amount, goal.currency, displayCurrency, rate)
                : goal.target_amount
            const conceptGroups = groupByConcept(goal)
            const suggestions = getConceptSuggestions(goal.id)

            return (
              <Card key={goal.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{goal.name}</CardTitle>
                      <CardDescription>
                        {goal.deadline &&
                          `Fecha limite: ${format(new Date(goal.deadline), "dd/MM/yyyy")}`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditGoal(goal)}
                        title="Editar objetivo"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteGoal(goal.id)}
                        title="Eliminar objetivo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{formatCurrency(displaySaved, displayCurrency)}</span>
                      <span className="text-muted-foreground">
                        meta: {formatCurrency(displayTarget, displayCurrency)}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(pct)}% completado
                      {pct < 100 && ` · faltan ${formatCurrency(displayTarget - displaySaved, displayCurrency)}`}
                    </p>
                  </div>

                  {/* Cumulative chart */}
                  {(() => {
                    const chartData = getCumulativeData(goal)
                    if (chartData.length < 2) return null
                    const targetVal = Math.round(
                      rate && displayCurrency !== goal.currency
                        ? convertCurrency(goal.target_amount, goal.currency, displayCurrency, rate)
                        : goal.target_amount
                    )
                    return (
                      <div className="pt-1">
                        <p className="text-xs text-muted-foreground mb-1">Progreso acumulado</p>
                        <ResponsiveContainer width="100%" height={120}>
                          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`grad-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
                            <YAxis hide domain={[0, Math.max(targetVal * 1.05, 1)]} />
                            <Tooltip
                              formatter={(v) => [formatCurrency(Number(v), goal.currency), "Ahorrado"]}
                            />
                            <ReferenceLine
                              y={targetVal}
                              stroke="#16a34a"
                              strokeDasharray="4 3"
                              label={{ value: "Meta", fontSize: 9, fill: "#16a34a", position: "right" }}
                            />
                            <Area
                              type="monotone"
                              dataKey="acumulado"
                              stroke="#2563eb"
                              fill={`url(#grad-${goal.id})`}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  })()}

                  {/* Concepts + contributions */}
                  {conceptGroups.length > 0 && (
                    <div className="border-t pt-2 space-y-2">
                      {conceptGroups.map(([concept, contribs]) => {
                        const conceptLabel = concept || "Sin concepto"
                        const isCollapsed = collapsedConcepts[goal.id]?.has(concept) ?? false
                        const conceptTotal = contribs.reduce((sum, c) => {
                          const amt = rate && c.currency !== goal.currency
                            ? convertCurrency(c.amount, c.currency, goal.currency, rate)
                            : c.amount
                          return sum + amt
                        }, 0)
                        const displayConceptTotal = rate && displayCurrency !== goal.currency
                          ? convertCurrency(conceptTotal, goal.currency, displayCurrency, rate)
                          : conceptTotal

                        return (
                          <div key={concept} className="rounded-md border bg-muted/30">
                            <div className="flex items-center">
                              <button
                                className="flex-1 flex items-center justify-between px-3 py-2 text-left"
                                onClick={() => toggleConcept(goal.id, concept)}
                              >
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                                  {isCollapsed
                                    ? <ChevronRight className="h-3 w-3" />
                                    : <ChevronDown className="h-3 w-3" />
                                  }
                                  {conceptLabel}
                                </span>
                                <span className="text-xs font-medium text-blue-600">
                                  {formatCurrency(displayConceptTotal, displayCurrency)}
                                </span>
                              </button>
                              {concept !== "" && (
                                <button
                                  className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
                                  title={`Agregar aporte a "${concept}"`}
                                  onClick={() => {
                                    setContribGoalId(goal.id)
                                    setContribCurrency(goal.currency)
                                    setContribConcept(concept)
                                    setContribAmount("")
                                    setContribDate(format(new Date(), "yyyy-MM-dd"))
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            {!isCollapsed && (
                              <div className="px-3 pb-2 space-y-0.5">
                                {contribs.map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between text-xs py-1 group border-t border-muted first:border-t-0"
                                  >
                                    <span className="text-muted-foreground">
                                      {format(new Date(c.date), "dd/MM/yyyy")}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium text-green-600">
                                        +{formatCurrency(c.amount, c.currency)}
                                      </span>
                                      <button
                                        onClick={() => handleDeleteContribution(c.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 ml-1"
                                        title="Eliminar aporte"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Add contribution form */}
                  {contribGoalId === goal.id ? (
                    <div className="space-y-3 border-t pt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Concepto (opcional)</Label>
                        <Input
                          list={`concepts-${goal.id}`}
                          placeholder="Ej: Sueldo, Bono, Extra..."
                          value={contribConcept}
                          onChange={(e) => setContribConcept(e.target.value)}
                        />
                        {suggestions.length > 0 && (
                          <datalist id={`concepts-${goal.id}`}>
                            {suggestions.map((s) => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Monto</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={contribAmount}
                            onChange={(e) => setContribAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Moneda</Label>
                          <Select
                            value={contribCurrency}
                            onValueChange={(v) =>
                              v && setContribCurrency(v as "ARS" | "USD")
                            }
                          >
                            <SelectTrigger>
                              <SelectValue>{contribCurrency}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ARS">ARS</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fecha</Label>
                        <Input
                          type="date"
                          value={contribDate}
                          onChange={(e) => setContribDate(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={handleAddContribution}
                          disabled={savingContrib || !contribAmount}
                        >
                          {savingContrib ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setContribGoalId(null)
                            setContribAmount("")
                            setContribConcept("")
                            setContribDate(format(new Date(), "yyyy-MM-dd"))
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1"
                      onClick={() => {
                        setContribGoalId(goal.id)
                        setContribCurrency(goal.currency)
                      }}
                    >
                      <Plus className="h-3 w-3" /> Agregar Aporte
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
