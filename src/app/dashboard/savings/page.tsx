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
import { Plus, PiggyBank, Trash2, Target } from "lucide-react"

const supabase = createClient()

export default function SavingsPage() {
  const userId = useUser()
  const { goals, loading, refresh } = useSavingsGoals(userId)
  const rate = useExchangeRate()
  const [displayCurrency, setDisplayCurrency] = useState<"ARS" | "USD">("ARS")

  // New Goal form
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [goalName, setGoalName] = useState("")
  const [goalTarget, setGoalTarget] = useState("")
  const [goalCurrency, setGoalCurrency] = useState<"ARS" | "USD">("ARS")
  const [goalDeadline, setGoalDeadline] = useState("")
  const [savingGoal, setSavingGoal] = useState(false)

  // Contribution form
  const [contribGoalId, setContribGoalId] = useState<string | null>(null)
  const [contribAmount, setContribAmount] = useState("")
  const [contribCurrency, setContribCurrency] = useState<"ARS" | "USD">("ARS")
  const [contribDate, setContribDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [savingContrib, setSavingContrib] = useState(false)

  async function handleCreateGoal() {
    if (!userId || !goalName || !goalTarget) return
    setSavingGoal(true)
    await supabase.from("savings_goals").insert({
      user_id: userId,
      name: goalName,
      target_amount: parseFloat(goalTarget),
      currency: goalCurrency,
      deadline: goalDeadline || null,
    })
    setSavingGoal(false)
    setGoalDialogOpen(false)
    setGoalName("")
    setGoalTarget("")
    setGoalCurrency("ARS")
    setGoalDeadline("")
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
      date: contribDate,
    })
    setSavingContrib(false)
    setContribGoalId(null)
    setContribAmount("")
    setContribDate(format(new Date(), "yyyy-MM-dd"))
    refresh()
  }

  async function handleDeleteGoal(id: string) {
    await supabase.from("savings_goals").delete().eq("id", id)
    refresh()
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

          <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-1" />}>
              <Plus className="h-4 w-4" /> Nuevo Objetivo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Objetivo de Ahorro</DialogTitle>
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
                  <Label>Fecha limite (opcional)</Label>
                  <Input
                    type="date"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateGoal}
                  className="w-full"
                  disabled={savingGoal || !goalName || !goalTarget}
                >
                  {savingGoal ? "Creando..." : "Crear Objetivo"}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{formatCurrency(displaySaved, displayCurrency)}</span>
                      <span className="text-muted-foreground">
                        de {formatCurrency(displayTarget, displayCurrency)}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(pct)}% completado
                    </p>
                  </div>

                  {contribGoalId === goal.id ? (
                    <div className="space-y-3 border-t pt-3">
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
                              <SelectValue />
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
                          onClick={() => setContribGoalId(null)}
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

                  {goal.savings_contributions.length > 0 && (
                    <div className="border-t pt-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Ultimos aportes
                      </p>
                      {goal.savings_contributions
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 3)
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex justify-between text-xs py-1"
                          >
                            <span>{format(new Date(c.date), "dd/MM/yyyy")}</span>
                            <span className="font-medium">
                              +{formatCurrency(c.amount, c.currency)}
                            </span>
                          </div>
                        ))}
                    </div>
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
