"use client"

import { useState, useEffect } from "react"
import type { MultiRate } from "@/app/api/exchange-rate/route"

export function ExchangeRateBadge() {
  const [rate, setRate] = useState<MultiRate | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then(r => r.json())
      .then(setRate)
      .catch(() => {})
  }, [])

  if (!rate || !rate.bna.venta) return null

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-2 text-xs bg-muted hover:bg-muted/80 rounded-lg px-3 py-1.5 transition-colors"
      >
        <span className="text-muted-foreground">USD</span>
        <span className="font-semibold text-foreground">${rate.bna.venta.toLocaleString("es-AR")}</span>
        {rate.blue.venta > 0 && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-muted-foreground">Blue</span>
            <span className="font-semibold text-foreground">${rate.blue.venta.toLocaleString("es-AR")}</span>
          </>
        )}
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-2 bg-card border rounded-xl shadow-lg p-3 z-50 min-w-[220px] text-xs">
          <p className="font-semibold text-sm mb-2">Cotizaciones USD</p>
          {[
            { label: "Oficial BNA", data: rate.bna },
            { label: "Dólar Blue", data: rate.blue },
            { label: "Dólar MEP", data: rate.mep },
          ].map(({ label, data }) => data.venta > 0 && (
            <div key={label} className="flex items-center justify-between py-1.5 border-b last:border-0">
              <span className="text-muted-foreground">{label}</span>
              <div className="text-right">
                <span className="text-green-600">C: ${data.compra.toLocaleString("es-AR")}</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span className="text-red-600">V: ${data.venta.toLocaleString("es-AR")}</span>
              </div>
            </div>
          ))}
          <p className="text-muted-foreground/60 mt-2 text-[10px]">
            Actualizado: {new Date(rate.fecha).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  )
}
