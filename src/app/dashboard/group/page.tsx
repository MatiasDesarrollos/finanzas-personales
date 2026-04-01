"use client"

import { useState, useMemo } from "react"
import { format, addMonths } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import {
  useUser,
  useGroups,
  useGroupMembers,
  useGroupTransactions,
  useGroupSavingsGoals,
  useExchangeRate,
} from "@/hooks/use-supabase"
import { useGroupContext } from "@/contexts/group-context"
import { formatCurrency, convertCurrency } from "@/lib/exchange-rate"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Copy,
  Check,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Crown,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

const supabase = createClient()

function isSavingTransaction(desc: string | null | undefined) {
  return (desc ?? "").startsWith("[Ahorro]")
}

export default function GroupPage() {
  const userId = useUser()
  const rate = useExchangeRate()
  const { currentGroupId, setCurrentGroupId } = useGroupContext()
  const { groups, loading: groupsLoading, createGroup, joinGroup, leaveGroup } = useGroups(userId)
  const currentGroup = groups.find((g) => g.id === currentGroupId) ?? null

  // Month navigation
  const [monthOffset, setMonthOffset] = useState(0)
  const currentDate = addMonths(new Date(), monthOffset)
  const monthKey = format(currentDate, "yyyy-MM")
  const monthLabel = format(currentDate, "MMMM yyyy", { locale: es })

  const { members } = useGroupMembers(currentGroupId)
  const { transactions } = useGroupTransactions(currentGroupId, monthKey)
  const { goals, refresh: refreshGoals } = useGroupSavingsGoals(currentGroupId)

  // Per-member summary
  const memberSummary = useMemo(() => {
    const map: Record<string, { ingresos: number; gastos: number; display_name: string }> = {}
    for (const m of members) {
      map[m.user_id] = { ingresos: 0, gastos: 0, display_name: m.display_name ?? "Miembro" }
    }
    for (const t of transactions) {
      if (!t.user_id || !map[t.user_id]) continue
      const amt = rate && t.currency !== "ARS"
        ? convertCurrency(t.amount, t.currency, "ARS", rate)
        : t.amount
      if (t.type === "income") map[t.user_id].ingresos += amt
      else if (!isSavingTransaction(t.description)) map[t.user_id].gastos += amt
    }
    return Object.entries(map).map(([uid, v]) => ({ uid, ...v }))
  }, [members, transactions, rate])

  // Invite code copy
  const [copied, setCopied] = useState(false)
  async function copyInviteCode() {
    if (!currentGroup?.invite_code) return
    await navigator.clipboard.writeText(currentGroup.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Create group dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [displayNameCreate, setDisplayNameCreate] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  async function handleCreateGroup() {
    if (!newGroupName.trim()) return
    setCreateLoading(true)
    const g = await createGroup(newGroupName.trim(), displayNameCreate.trim() || "Admin")
    if (g) { setCurrentGroupId(g.id); setCreateOpen(false); setNewGroupName(""); setDisplayNameCreate("") }
    setCreateLoading(false)
  }

  // Join group dialog
  const [joinOpen, setJoinOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [displayNameJoin, setDisplayNameJoin] = useState("")
  const [joinError, setJoinError] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)
  async function handleJoinGroup() {
    if (!inviteCode.trim()) return
    setJoinLoading(true)
    setJoinError("")
    const g = await joinGroup(inviteCode.trim(), displayNameJoin.trim() || "Miembro")
    if (!g) { setJoinError("Código inválido. Verificá e intentá de nuevo."); setJoinLoading(false); return }
    setCurrentGroupId(g.id)
    setJoinOpen(false)
    setInviteCode("")
    setDisplayNameJoin("")
    setJoinLoading(false)
  }

  // Savings goal form
  const [goalOpen, setGoalOpen] = useState(false)
  const [goalName, setGoalName] = useState("")
  const [goalAmount, setGoalAmount] = useState("")
  const [goalCurrency, setGoalCurrency] = useState<"ARS" | "USD">("ARS")
  const [goalDeadline, setGoalDeadline] = useState("")
  const [goalLoading, setGoalLoading] = useState(false)
  async function handleCreateGoal() {
    if (!currentGroupId || !userId || !goalName.trim() || !goalAmount) return
    setGoalLoading(true)
    await supabase.from("savings_goals").insert({
      user_id: userId, group_id: currentGroupId, name: goalName.trim(),
      target_amount: parseFloat(goalAmount), currency: goalCurrency,
      deadline: goalDeadline || null,
    })
    refreshGoals()
    setGoalOpen(false)
    setGoalName(""); setGoalAmount(""); setGoalDeadline("")
    setGoalLoading(false)
  }

  async function handleLeave() {
    if (!currentGroupId) return
    await leaveGroup(currentGroupId)
    setCurrentGroupId(null)
  }

  const totalGoalSaved = (goal: typeof goals[0]) =>
    goal.savings_contributions.reduce((s, c) => {
      const amt = rate && c.currency !== goal.currency
        ? convertCurrency(c.amount, c.currency, goal.currency, rate) : c.amount
      return s + amt
    }, 0)

  if (groupsLoading) return null

  // Empty state — no groups
  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Mi Grupo
        </h1>
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
            <Users className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">Todavía no tenés grupos</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Creá un grupo familiar o uníte con un código de invitación.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={<Button className="gap-2" />}>
                <Plus className="h-4 w-4" /> Crear grupo
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Crear nuevo grupo</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Nombre del grupo</Label>
                    <Input placeholder="Ej: Familia García" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tu nombre en el grupo</Label>
                    <Input placeholder="Ej: Matías" value={displayNameCreate} onChange={(e) => setDisplayNameCreate(e.target.value)} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
                    <Button onClick={handleCreateGroup} disabled={createLoading || !newGroupName.trim()}>
                      {createLoading ? "Creando..." : "Crear"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
                🔗 Unirme con código
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Unirme a un grupo</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Código de invitación</Label>
                    <Input placeholder="Ej: ABC123" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} maxLength={8} className="font-mono tracking-widest text-center" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tu nombre en el grupo</Label>
                    <Input placeholder="Ej: Matías" value={displayNameJoin} onChange={(e) => setDisplayNameJoin(e.target.value)} />
                  </div>
                  {joinError && <p className="text-sm text-destructive">{joinError}</p>}
                  <div className="flex gap-2 justify-end">
                    <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
                    <Button onClick={handleJoinGroup} disabled={joinLoading || !inviteCode.trim()}>
                      {joinLoading ? "Uniéndome..." : "Unirme"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    )
  }

  // Has groups but none selected
  if (!currentGroupId) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Mi Grupo
        </h1>
        <p className="text-muted-foreground text-sm">Seleccioná un grupo desde el menú lateral.</p>
        <div className="flex flex-wrap gap-3">
          {groups.map((g) => (
            <Button key={g.id} variant="outline" onClick={() => setCurrentGroupId(g.id)} className="gap-2">
              <Users className="h-4 w-4" /> {g.name}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-600" /> {currentGroup?.name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {currentGroup?.invite_code && (
            <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Código:</span>
              <span className="font-mono font-bold text-sm tracking-widest">{currentGroup.invite_code}</span>
              <button onClick={copyInviteCode} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleLeave}>
            <LogOut className="h-3.5 w-3.5" /> Salir del grupo
          </Button>
        </div>
      </div>

      {/* Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Miembros ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <div className="h-7 w-7 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-xs font-bold text-teal-700 dark:text-teal-400">
                  {(m.display_name ?? "?")[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium">{m.display_name ?? "Miembro"}</span>
                {m.role === "admin" && <Crown className="h-3 w-3 text-yellow-500" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Month nav + per-member summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm capitalize">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setMonthOffset((o) => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonthOffset(0)}>Hoy</Button>
            <Button variant="outline" size="icon" onClick={() => setMonthOffset((o) => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberSummary.map(({ uid, ingresos, gastos, display_name }) => (
            <Card key={uid}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-xs font-bold text-teal-700">
                    {display_name[0].toUpperCase()}
                  </div>
                  {display_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-green-600"><TrendingUp className="h-3.5 w-3.5" /> Ingresos</span>
                  <span className="font-semibold text-green-600">{formatCurrency(ingresos, "ARS")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-red-600"><TrendingDown className="h-3.5 w-3.5" /> Gastos</span>
                  <span className="font-semibold text-red-600">{formatCurrency(gastos, "ARS")}</span>
                </div>
                <div className="border-t pt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Balance</span>
                  <span className={`font-bold ${ingresos - gastos >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(ingresos - gastos, "ARS")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Shared savings goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-blue-600" /> Objetivos del grupo
          </h2>
          <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
              <Plus className="h-3.5 w-3.5" /> Nuevo objetivo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo objetivo compartido</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <Input placeholder="Ej: Vacaciones, TV nueva..." value={goalName} onChange={(e) => setGoalName(e.target.value)} autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Monto objetivo</Label>
                    <Input type="number" min={0} placeholder="0" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Moneda</Label>
                    <Select value={goalCurrency} onValueChange={(v) => v && setGoalCurrency(v as "ARS" | "USD")}>
                      <SelectTrigger><SelectValue>{goalCurrency}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha límite (opcional)</Label>
                  <Input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end">
                  <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
                  <Button onClick={handleCreateGoal} disabled={goalLoading || !goalName.trim() || !goalAmount}>
                    {goalLoading ? "Guardando..." : "Crear objetivo"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay objetivos de ahorro grupales todavía.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const saved = totalGoalSaved(goal)
              const pct = Math.min(100, goal.target_amount > 0 ? Math.round((saved / goal.target_amount) * 100) : 0)
              return (
                <Card key={goal.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{goal.name}</CardTitle>
                      <Badge variant={pct >= 100 ? "default" : "secondary"}>{pct}%</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(saved, goal.currency)}</span>
                      <span>{formatCurrency(goal.target_amount, goal.currency)}</span>
                    </div>
                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground">
                        Plazo: {format(new Date(goal.deadline + "T00:00:00"), "dd/MM/yyyy")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent group transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base capitalize">Movimientos del grupo — {monthLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 10).map((t) => {
                const memberName = members.find((m) => m.user_id === t.user_id)?.display_name ?? "?"
                return (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">
                        {(t.description ?? "").replace(/^\[Ahorro\]\s*/, "") || t.categories?.name || "Sin descripción"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.date + "T00:00:00"), "dd/MM/yyyy")} · {memberName}
                        {t.categories?.name ? ` · ${t.categories.name}` : ""}
                      </p>
                    </div>
                    <Badge variant={t.type === "income" ? "default" : "destructive"}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
