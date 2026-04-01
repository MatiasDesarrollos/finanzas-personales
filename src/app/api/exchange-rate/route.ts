import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 3600 // 1 hour cache

export type MultiRate = {
  bna: { compra: number; venta: number }
  blue: { compra: number; venta: number }
  mep: { compra: number; venta: number }
  fecha: string
  // Legacy compat
  compra: number
  venta: number
}

export async function GET() {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "FinanzasFamilia/1.0" },
    })

    if (!res.ok) throw new Error("API error")

    const data = await res.json()

    // dolarapi returns array of: { casa, nombre, compra, venta, fechaActualizacion }
    const find = (casa: string) => data.find((d: any) => d.casa?.toLowerCase() === casa.toLowerCase())

    const oficial = find("oficial") ?? find("bna") ?? {}
    const blue = find("blue") ?? {}
    const bolsa = find("bolsa") ?? find("mep") ?? {}

    const result: MultiRate = {
      bna: { compra: oficial.compra ?? 0, venta: oficial.venta ?? 0 },
      blue: { compra: blue.compra ?? 0, venta: blue.venta ?? 0 },
      mep: { compra: bolsa.compra ?? 0, venta: bolsa.venta ?? 0 },
      fecha: oficial.fechaActualizacion ?? new Date().toISOString(),
      // Legacy compat for existing code
      compra: oficial.compra ?? 0,
      venta: oficial.venta ?? 0,
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    })
  } catch (e) {
    // Fallback
    return NextResponse.json({
      bna: { compra: 1000, venta: 1050 },
      blue: { compra: 1200, venta: 1250 },
      mep: { compra: 1150, venta: 1180 },
      fecha: new Date().toISOString(),
      compra: 1000,
      venta: 1050,
    })
  }
}
