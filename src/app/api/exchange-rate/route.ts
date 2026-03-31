import { fetchBNARate } from "@/lib/exchange-rate"
import { NextResponse } from "next/server"

export async function GET() {
  const rate = await fetchBNARate()
  return NextResponse.json(rate)
}
