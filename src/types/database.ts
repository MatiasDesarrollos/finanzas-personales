export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
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
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
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
          type?: "income" | "expense"
          amount?: number
          currency?: "ARS" | "USD"
          description?: string | null
          date?: string
          is_recurring?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      savings_goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          currency: "ARS" | "USD"
          deadline: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          currency?: "ARS" | "USD"
          deadline?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          currency?: "ARS" | "USD"
          deadline?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "savings_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"]
export type SavingsContribution = Database["public"]["Tables"]["savings_contributions"]["Row"]

export type TransactionWithCategory = Transaction & {
  categories: Category | null
}

export type SavingsGoalWithContributions = SavingsGoal & {
  savings_contributions: SavingsContribution[]
}

export type ExchangeRate = {
  compra: number
  venta: number
  fecha: string
}
