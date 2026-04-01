export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          display_name: string | null
          preferred_currency: "ARS" | "USD"
          onboarding_completed: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          display_name?: string | null
          preferred_currency?: "ARS" | "USD"
          onboarding_completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          display_name?: string | null
          preferred_currency?: "ARS" | "USD"
          onboarding_completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: "income" | "expense"
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: "income" | "expense"
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: "income" | "expense"
          icon?: string | null
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          group_id: string | null
          type: "income" | "expense"
          amount: number
          currency: "ARS" | "USD"
          description: string | null
          date: string
          is_recurring: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          group_id?: string | null
          type: "income" | "expense"
          amount: number
          currency?: "ARS" | "USD"
          description?: string | null
          date: string
          is_recurring?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          group_id?: string | null
          type?: "income" | "expense"
          amount?: number
          currency?: "ARS" | "USD"
          description?: string | null
          date?: string
          is_recurring?: boolean
          created_at?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          id: string
          user_id: string
          group_id: string | null
          name: string
          target_amount: number
          currency: "ARS" | "USD"
          deadline: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          group_id?: string | null
          name: string
          target_amount: number
          currency?: "ARS" | "USD"
          deadline?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string | null
          name?: string
          target_amount?: number
          currency?: "ARS" | "USD"
          deadline?: string | null
          created_at?: string
        }
        Relationships: []
      }
      savings_contributions: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          amount: number
          currency: "ARS" | "USD"
          concept: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id: string
          amount: number
          currency?: "ARS" | "USD"
          concept?: string | null
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string
          amount?: number
          currency?: "ARS" | "USD"
          concept?: string | null
          date?: string
          created_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          currency: "ARS" | "USD"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          amount: number
          currency?: "ARS" | "USD"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          amount?: number
          currency?: "ARS" | "USD"
          created_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          created_by: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          invite_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          invite_code?: string
          created_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: "admin" | "member"
          display_name: string | null
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: "admin" | "member"
          display_name?: string | null
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: "admin" | "member"
          display_name?: string | null
          joined_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"]
export type SavingsContribution = Database["public"]["Tables"]["savings_contributions"]["Row"]
export type Budget = Database["public"]["Tables"]["budgets"]["Row"]
export type Group = Database["public"]["Tables"]["groups"]["Row"]
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"]

export type TransactionWithCategory = Transaction & {
  categories: Category | null
}

export type SavingsGoalWithContributions = SavingsGoal & {
  savings_contributions: SavingsContribution[]
}

export type BudgetWithCategory = Budget & {
  categories: Category
}

export type ExchangeRate = {
  compra: number
  venta: number
  fecha: string
}
