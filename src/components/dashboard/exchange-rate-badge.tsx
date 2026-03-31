"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { DollarSign } from "lucide-react"
import type { ExchangeRate } from "@/types/database"

export function ExchangeRateBadge() {
  const [rate, setRate] = useState<ExchangeRate | null>(null)

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((res) => res.json())
      .then(setRate)
      .catch(() => {})
  }, [])

  if (!rate || rate.venta === 0) return null

  return (
    <Badge variant="secondary" className="gap-1 text-xs font-normal">
      <DollarSign className="h-3 w-3" />
      USD Oficial: ${rate.venta.toLocaleString("es-AR")}
    </Badge>
  )
}
