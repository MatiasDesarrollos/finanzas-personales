"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  Category,
  TransactionWithCategory,
  SavingsGoalWithContributions,
  ExchangeRate,
} from "@/types/database"

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
    const endDate = `${month}-31`
    const { data } = await supabase
      .from("transactions")
      .select("*, categories(*)")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
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
