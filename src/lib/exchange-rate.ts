import type { ExchangeRate } from "@/types/database"

let cachedRate: { data: ExchangeRate; timestamp: number } | null = null
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

export async function fetchBNARate(): Promise<ExchangeRate> {
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
    return cachedRate.data
  }

  try {
    const res = await fetch(
      "https://dolarapi.com/v1/dolares/oficial",
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) throw new Error("Failed to fetch exchange rate")

    const data = await res.json()

    const rate: ExchangeRate = {
      compra: data.compra,
      venta: data.venta,
      fecha: data.fechaActualizacion || new Date().toISOString(),
    }

    cachedRate = { data: rate, timestamp: Date.now() }
    return rate
  } catch {
    // Fallback rate if API fails
    return {
      compra: 0,
      venta: 0,
      fecha: new Date().toISOString(),
    }
  }
}

export function convertCurrency(
  amount: number,
  from: "ARS" | "USD",
  to: "ARS" | "USD",
  rate: ExchangeRate
): number {
  if (from === to) return amount
  if (from === "USD" && to === "ARS") return amount * rate.venta
  if (from === "ARS" && to === "USD") return rate.venta > 0 ? amount / rate.venta : 0
  return amount
}

export function formatCurrency(amount: number, currency: "ARS" | "USD"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}
