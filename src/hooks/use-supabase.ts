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
  Profile,
  BudgetWithCategory,
  Group,
  GroupMember,
} from "@/types/database"

export type MonthlyTotal = {
  month: string
  monthKey: string
  ingresos: number
  gastos: number
  ahorro: number
  balance: number
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

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
    setProfile(data ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  async function updateProfile(updates: Partial<Profile>) {
    if (!userId) return
    await supabase.from("profiles").upsert({ id: userId, ...updates })
    refresh()
  }

  return { profile, loading, refresh, updateProfile }
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

  useEffect(() => { refresh() }, [refresh])

  return { categories, loading, refresh }
}

export function useTransactions(userId: string | null, month: string) {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const startDate = `${month}-01`
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
    setTransactions((data as unknown as TransactionWithCategory[]) ?? [])
    setLoading(false)
  }, [userId, month])

  useEffect(() => { refresh() }, [refresh])

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
    setGoals((data as unknown as SavingsGoalWithContributions[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { goals, loading, refresh }
}

export function useMonthlyTotals(userId: string | null) {
  const [data, setData] = useState<MonthlyTotal[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data: txs } = await supabase
      .from("transactions")
      .select("type, amount, description, date")
      .eq("user_id", userId)
      .order("date")

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

export function useBudgets(userId: string | null) {
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from("budgets")
      .select("*, categories(*)")
      .eq("user_id", userId)
    setBudgets((data as unknown as BudgetWithCategory[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  async function upsertBudget(categoryId: string, amount: number, currency: "ARS" | "USD" = "ARS") {
    if (!userId) return
    await supabase.from("budgets").upsert(
      { user_id: userId, category_id: categoryId, amount, currency },
      { onConflict: "user_id,category_id" }
    )
    refresh()
  }

  async function deleteBudget(categoryId: string) {
    if (!userId) return
    await supabase.from("budgets").delete()
      .eq("user_id", userId)
      .eq("category_id", categoryId)
    refresh()
  }

  return { budgets, loading, refresh, upsertBudget, deleteBudget }
}

export function useGroups(userId: string | null) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId)

    if (!memberships || memberships.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    const groupIds = memberships.map((m) => m.group_id)
    const { data } = await supabase
      .from("groups")
      .select("*")
      .in("id", groupIds)
      .order("created_at")

    setGroups(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  async function createGroup(name: string, displayName: string): Promise<Group | null> {
    if (!userId) return null
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: group } = await supabase
      .from("groups")
      .insert({ name, created_by: userId, invite_code })
      .select()
      .single()
    if (group) {
      await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: userId,
        role: "admin",
        display_name: displayName,
      })
      refresh()
    }
    return group ?? null
  }

  async function joinGroup(inviteCode: string, displayName: string): Promise<Group | null> {
    if (!userId) return null
    const { data: group } = await supabase
      .from("groups")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .single()
    if (!group) return null
    await supabase.from("group_members").upsert({
      group_id: group.id,
      user_id: userId,
      role: "member",
      display_name: displayName,
    }, { onConflict: "group_id,user_id" })
    refresh()
    return group
  }

  async function leaveGroup(groupId: string) {
    if (!userId) return
    await supabase.from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId)
    refresh()
  }

  return { groups, loading, refresh, createGroup, joinGroup, leaveGroup }
}

export function useGroupMembers(groupId: string | null) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .order("joined_at")
    setMembers(data ?? [])
    setLoading(false)
  }, [groupId])

  useEffect(() => { refresh() }, [refresh])

  return { members, loading, refresh }
}

export function useGroupSavingsGoals(groupId: string | null) {
  const [goals, setGoals] = useState<SavingsGoalWithContributions[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data } = await supabase
      .from("savings_goals")
      .select("*, savings_contributions(*)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
    setGoals((data as unknown as SavingsGoalWithContributions[]) ?? [])
    setLoading(false)
  }, [groupId])

  useEffect(() => { refresh() }, [refresh])

  return { goals, loading, refresh }
}

export function useGroupTransactions(groupId: string | null, month: string) {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const startDate = `${month}-01`
    const [year, mon] = month.split("-").map(Number)
    const nextMonth = mon === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(mon + 1).padStart(2, "0")}-01`
    const { data } = await supabase
      .from("transactions")
      .select("*, categories(*)")
      .eq("group_id", groupId)
      .gte("date", startDate)
      .lt("date", nextMonth)
      .order("date", { ascending: false })
    setTransactions((data as unknown as TransactionWithCategory[]) ?? [])
    setLoading(false)
  }, [groupId, month])

  useEffect(() => { refresh() }, [refresh])

  return { transactions, loading, refresh }
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
