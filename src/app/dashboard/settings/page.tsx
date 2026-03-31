"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser, useCategories } from "@/hooks/use-supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Settings, Tag } from "lucide-react"

const supabase = createClient()

export default function SettingsPage() {
  const userId = useUser()
  const { categories, refresh } = useCategories(userId)

  const [newCatName, setNewCatName] = useState("")
  const [newCatType, setNewCatType] = useState<"income" | "expense">("expense")
  const [saving, setSaving] = useState(false)

  async function handleAddCategory() {
    if (!userId || !newCatName.trim()) return
    setSaving(true)
    await supabase.from("categories").insert({
      user_id: userId,
      name: newCatName.trim(),
      type: newCatType,
    })
    setNewCatName("")
    setSaving(false)
    refresh()
  }

  async function handleDeleteCategory(id: string) {
    await supabase.from("categories").delete().eq("id", id)
    refresh()
  }

  const incomeCategories = categories.filter((c) => c.type === "income")
  const expenseCategories = categories.filter((c) => c.type === "expense")

  if (!userId) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Settings className="h-5 w-5" /> Configuracion
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" /> Categorias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Nombre de categoria"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 min-w-[200px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory()
              }}
            />
            <Select
              value={newCatType}
              onValueChange={(v) => v && setNewCatType(v as "income" | "expense")}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="expense">Gasto</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddCategory}
              disabled={saving || !newCatName.trim()}
              size="sm"
              className="gap-1"
            >
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2 text-green-600">Ingresos</h3>
            {incomeCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin categorias de ingreso</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {incomeCategories.map((c) => (
                  <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
                    {c.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:text-destructive"
                      onClick={() => handleDeleteCategory(c.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 text-red-600">Gastos</h3>
            {expenseCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin categorias de gasto</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map((c) => (
                  <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
                    {c.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:text-destructive"
                      onClick={() => handleDeleteCategory(c.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
