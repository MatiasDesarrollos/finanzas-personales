"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PiggyBank, BarChart3, Users, Target } from "lucide-react"

const DEFAULT_CATEGORIES = [
  { name: "Sueldo", type: "income" as const },
  { name: "Freelance", type: "income" as const },
  { name: "Otros Ingresos", type: "income" as const },
  { name: "Alquiler", type: "expense" as const },
  { name: "Supermercado", type: "expense" as const },
  { name: "Servicios", type: "expense" as const },
  { name: "Transporte", type: "expense" as const },
  { name: "Salud", type: "expense" as const },
  { name: "Educacion", type: "expense" as const },
  { name: "Entretenimiento", type: "expense" as const },
  { name: "Ropa", type: "expense" as const },
  { name: "Restaurantes", type: "expense" as const },
  { name: "Otros Gastos", type: "expense" as const },
]

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const categories = DEFAULT_CATEGORIES.map((cat) => ({
        user_id: data.user!.id,
        name: cat.name,
        type: cat.type,
      }))
      await supabase.from("categories").insert(categories)
    }

    router.push("/onboarding")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-blue-300" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Finanzas Familia</span>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight mb-4">
              Empezá a controlar<br />
              <span className="text-blue-400">tu dinero hoy</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Creá tu cuenta en segundos y empezá a tomar mejores decisiones financieras.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: BarChart3, text: "Reportes visuales de ingresos y gastos" },
              { icon: Users, text: "Finanzas compartidas con tu familia o pareja" },
              { icon: Target, text: "Objetivos de ahorro con seguimiento en tiempo real" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/15 border border-blue-400/20 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-slate-600 text-xs">© 2026 Finanzas Familia</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <PiggyBank className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Finanzas Familia</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-1">Creá tu cuenta</h2>
            <p className="text-muted-foreground text-sm">Gratis para siempre, sin tarjeta de crédito</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium">Nombre completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                minLength={6}
                required
              />
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline underline-offset-4">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
