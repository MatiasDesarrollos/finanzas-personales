"use client"

import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import type {
  Category,
  TransactionWithCategory,
  SavingsGoalWithContributions,
  ExchangeRate,
} from "@/types/database"

export type MonthlyTotal = {
  month: string      // label: "Mar 25"
  monthKey: string   // "yyyy-MM"
  ingresos: number
  gastos: number     // pure expenses (NOT including ahorro)
  ahorro: number
  balance: number    // ingresos - gastos - ahorro
}

const supabase = createClient()

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  return userId
}

export function useCategories(userId: string | null) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("name")
    setCategories(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { categories, loading, refresh }
}

export function useTransactions(userId: string | null, month: string) {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const startDate = `${month}-01`
    // Use first day of next month with lt to avoid invalid dates (e.g. April 31)
    const [year, mon] = month.split("-").map(Number)
    const nextMonth = mon === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(mon + 1).padStart(2, "0")}-01`
    const { data } = await supabase
      .from("transactions")
      .select("*, categories(*)")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lt("date", nextMonth)
      .order("date", { ascending: false })
    setTransactions((data as TransactionWithCategory[]) ?? [])
    setLoading(false)
  }, [userId, month])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { transactions, loading, refresh }
}

export function useSavingsGoals(userId: string | null) {
  const [goals, setGoals] = useState<SavingsGoalWithContributions[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from("savings_goals")
      .select("*, savings_contributions(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    setGoals((data as SavingsGoalWithContributions[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { goals, loading, refresh }
}

export function useMonthlyTotals(userId: string | null) {
  const [data, setData] = useState<MonthlyTotal[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    // Fetch ALL transactions (no date filter) to build a full history
    const { data: txs } = await supabase
      .from("transactions")
      .select("type, amount, description, date")
      .eq("user_id", userId)
      .order("date")

    // Group by month key
    const grouped: Record<string, { ingresos: number; gastos: number; ahorro: number }> = {}
    for (const t of txs ?? []) {
      const key = t.date.substring(0, 7)
      if (!grouped[key]) grouped[key] = { ingresos: 0, gastos: 0, ahorro: 0 }
      const isSaving = typeof t.description === "string" && t.description.startsWith("[Ahorro]")
      if (t.type === "income") {
        grouped[key].ingresos += t.amount
      } else if (isSaving) {
        grouped[key].ahorro += t.amount
      } else {
        grouped[key].gastos += t.amount
      }
    }

    // Build array only for months that have data
    const result: MonthlyTotal[] = Object.keys(grouped)
      .sort()
      .map((key) => {
        const g = grouped[key]
        const [y, m] = key.split("-").map(Number)
        const d = new Date(y, m - 1, 1)
        return {
          month: format(d, "MMM yy", { locale: es }),
          monthKey: key,
          ingresos: Math.round(g.ingresos),
          gastos: Math.round(g.gastos),
          ahorro: Math.round(g.ahorro),
          balance: Math.round(g.ingresos - g.gastos - g.ahorro),
        }
      })

    setData(result)
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { data, loading, refresh }
}

export function useExchangeRate() {
  const [rate, setRate] = useState<ExchangeRate | null>(null)

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((res) => res.json())
      .then(setRate)
      .catch(() => {})
  }, [])

  return rate
}
