"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser, useCategories, useSavingsGoals } from "@/hooks/use-supabase"
import { Button } from "@/components/ui/button"
import { Plus, X, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const supabase = createClient()

type TxType = "expense" | "income" | "saving"

export function QuickAddButton({ onAdded }: { onAdded?: () => void }) {
  const userId = useUser()
  const { categories } = useCategories(userId)
  const { goals } = useSavingsGoals(userId)

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"type" | "detail">("type")
  const [txType, setTxType] = useState<TxType>("expense")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [goalId, setGoalId] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const expenseCategories = categories.filter(c => c.type === "expense")
  const incomeCategories = categories.filter(c => c.type === "income")

  function handleOpen() {
    setStep("type")
    setAmount("")
    setCategoryId("")
    setGoalId("")
    setDescription("")
    setOpen(true)
  }

  function handleSelectType(t: TxType) {
    setTxType(t)
    setStep("detail")
  }

  async function handleSave() {
    if (!userId || !amount) return
    const amt = parseFloat(amount.replace(",", "."))
    if (isNaN(amt) || amt <= 0) return
    setSaving(true)

    if (txType === "saving" && goalId) {
      // Add savings contribution
      const goal = goals.find(g => g.id === goalId)
      await supabase.from("savings_contributions").insert({
        user_id: userId,
        goal_id: goalId,
        amount: amt,
        currency: goal?.currency ?? "ARS",
        concept: description || null,
        date: format(new Date(), "yyyy-MM-dd"),
      })
      // Also insert as expense transaction with [Ahorro] prefix
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "expense",
        amount: amt,
        currency: goal?.currency ?? "ARS",
        description: `[Ahorro] ${goal?.name ?? ""}`.trim(),
        date: format(new Date(), "yyyy-MM-dd"),
        category_id: null,
        is_recurring: false,
      })
    } else {
      await supabase.from("transactions").insert({
        user_id: userId,
        type: txType === "income" ? "income" : "expense",
        amount: amt,
        currency: "ARS",
        category_id: categoryId || null,
        description: description || null,
        date: format(new Date(), "yyyy-MM-dd"),
        is_recurring: false,
      })
    }

    setSaving(false)
    setOpen(false)
    onAdded?.()
  }

  const typeConfig = {
    expense: { label: "Gasté", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40", icon: TrendingDown },
    income: { label: "Gané", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40", icon: TrendingUp },
    saving: { label: "Ahorré", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40", icon: PiggyBank },
  }

  const relevantCategories = txType === "income" ? incomeCategories : expenseCategories

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-background rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pb-8 pt-2 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {step === "type" ? "¿Qué querés registrar?" : typeConfig[txType].label}
                </h2>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Step 1: Type selection */}
              {step === "type" && (
                <div className="grid grid-cols-3 gap-3">
                  {(["expense", "income", "saving"] as TxType[]).map(t => {
                    const cfg = typeConfig[t]
                    const Icon = cfg.icon
                    return (
                      <button
                        key={t}
                        onClick={() => handleSelectType(t)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all active:scale-95",
                          cfg.bg
                        )}
                      >
                        <Icon className={cn("h-7 w-7", cfg.color)} />
                        <span className={cn("text-base font-bold", cfg.color)}>{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step 2: Detail */}
              {step === "detail" && (
                <div className="space-y-4">
                  {/* Back */}
                  <button
                    onClick={() => setStep("type")}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    ← Cambiar tipo
                  </button>

                  {/* Amount — big and prominent */}
                  <div className="text-center">
                    <div className="relative inline-flex items-center">
                      <span className="text-4xl font-bold text-muted-foreground mr-1">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        autoFocus
                        className="text-5xl font-bold bg-transparent border-none outline-none w-48 text-center placeholder:text-muted-foreground/30"
                      />
                    </div>
                    <div className="h-0.5 bg-border mt-2" />
                  </div>

                  {/* Category chips */}
                  {txType !== "saving" && relevantCategories.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Categoría</p>
                      <div className="flex flex-wrap gap-2">
                        {relevantCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setCategoryId(cat.id === categoryId ? "" : cat.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                              categoryId === cat.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted border-transparent hover:border-border"
                            )}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Savings goal picker */}
                  {txType === "saving" && goals.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">¿Para qué objetivo?</p>
                      <div className="flex flex-wrap gap-2">
                        {goals.map(g => (
                          <button
                            key={g.id}
                            onClick={() => setGoalId(g.id === goalId ? "" : g.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                              goalId === g.id
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-muted border-transparent hover:border-border"
                            )}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description (optional) */}
                  <div>
                    <input
                      type="text"
                      placeholder="Descripción (opcional)"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-0 py-2 text-sm bg-transparent border-b border-border outline-none placeholder:text-muted-foreground/50 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Save button */}
                  <Button
                    onClick={handleSave}
                    disabled={saving || !amount || parseFloat(amount) <= 0}
                    className="w-full h-12 text-base font-semibold"
                  >
                    {saving ? "Guardando..." : `Guardar ${typeConfig[txType].label.toLowerCase()}`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
