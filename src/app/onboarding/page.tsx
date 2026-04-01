"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { PiggyBank, User, DollarSign, Users, ArrowRight, Check } from "lucide-react"

const supabase = createClient()

type Mode = "solo" | "group"
type GroupAction = "create" | "join"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Step 1 — profile
  const [displayName, setDisplayName] = useState("")
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS")

  // Step 2 — mode
  const [mode, setMode] = useState<Mode | null>(null)

  // Step 3 — group
  const [groupAction, setGroupAction] = useState<GroupAction>("create")
  const [groupName, setGroupName] = useState("")
  const [inviteCode, setInviteCode] = useState("")

  async function handleFinish() {
    setSaving(true)
    setError("")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    // Save profile
    await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName.trim() || user.email?.split("@")[0] || "Usuario",
      preferred_currency: currency,
      onboarding_completed: true,
    })

    // Handle group
    if (mode === "group") {
      const dn = displayName.trim() || user.email?.split("@")[0] || "Usuario"
      if (groupAction === "create" && groupName.trim()) {
        const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
        const groupId = crypto.randomUUID()
        const { error: groupError } = await supabase
          .from("groups")
          .insert({ id: groupId, name: groupName.trim(), created_by: user.id, invite_code })
        if (!groupError) {
          await supabase.from("group_members").insert({
            group_id: groupId,
            user_id: user.id,
            role: "admin",
            display_name: dn,
          })
          try { localStorage.setItem("current_group_id", groupId) } catch {}
        }
      } else if (groupAction === "join" && inviteCode.trim()) {
        const { data: group } = await supabase
          .from("groups")
          .select("*")
          .eq("invite_code", inviteCode.trim().toUpperCase())
          .single()
        if (!group) {
          setError("Código inválido. Verificá el código e intentá de nuevo.")
          setSaving(false)
          return
        }
        await supabase.from("group_members").upsert({
          group_id: group.id,
          user_id: user.id,
          role: "member",
          display_name: dn,
        }, { onConflict: "group_id,user_id" })
        try { localStorage.setItem("current_group_id", group.id) } catch {}
      }
    }

    router.push("/dashboard")
    router.refresh()
  }

  const totalSteps = mode === "group" ? 3 : 2

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950/5 to-background flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <PiggyBank className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold">Finanzas Familia</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i + 1 <= step ? "bg-blue-600 w-8" : "bg-muted w-2"
            }`}
          />
        ))}
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-8 pb-8 px-8 space-y-6">
          {/* ─── Step 1: Profile ─────────────────────── */}
          {step === 1 && (
            <>
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 mb-3">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold">¡Bienvenido!</h2>
                <p className="text-muted-foreground text-sm">Configuremos tu perfil en 2 minutos</p>
              </div>

              <div className="space-y-2">
                <Label>¿Cómo te llamás?</Label>
                <Input
                  placeholder="Ej: Matías"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Moneda preferida
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["ARS", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`border-2 rounded-xl p-4 text-center transition-all ${
                        currency === c
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40"
                          : "border-muted hover:border-muted-foreground"
                      }`}
                    >
                      <p className="font-bold text-lg">{c}</p>
                      <p className="text-xs text-muted-foreground">{c === "ARS" ? "Pesos argentinos" : "Dólares"}</p>
                      {currency === c && <Check className="h-4 w-4 text-blue-600 mx-auto mt-1" />}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => setStep(2)}
                disabled={!displayName.trim()}
              >
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* ─── Step 2: Mode ────────────────────────── */}
          {step === 2 && (
            <>
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 mb-3">
                  <Users className="h-6 w-6 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold">¿Cómo vas a usar la app?</h2>
                <p className="text-muted-foreground text-sm">Podés cambiar esto después desde Configuración</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setMode("solo")}
                  className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
                    mode === "solo"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40"
                      : "border-muted hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">👤</span>
                    <div>
                      <p className="font-semibold">Solo</p>
                      <p className="text-sm text-muted-foreground">Uso personal, solo veo mis propias finanzas</p>
                    </div>
                    {mode === "solo" && <Check className="h-5 w-5 text-blue-600 ml-auto shrink-0 mt-1" />}
                  </div>
                </button>

                <button
                  onClick={() => setMode("group")}
                  className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
                    mode === "group"
                      ? "border-teal-600 bg-teal-50 dark:bg-teal-950/40"
                      : "border-muted hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">👨‍👩‍👧</span>
                    <div>
                      <p className="font-semibold">Con familia o pareja</p>
                      <p className="text-sm text-muted-foreground">Crear o unirme a un grupo para ver finanzas compartidas</p>
                    </div>
                    {mode === "group" && <Check className="h-5 w-5 text-teal-600 ml-auto shrink-0 mt-1" />}
                  </div>
                </button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Atrás
                </Button>
                {mode === "group" ? (
                  <Button className="flex-1 gap-2" onClick={() => setStep(3)}>
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleFinish}
                    disabled={!mode || saving}
                  >
                    {saving ? "Guardando..." : "Empezar"} {!saving && <ArrowRight className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ─── Step 3: Group setup ─────────────────── */}
          {step === 3 && (
            <>
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 mb-3">
                  <Users className="h-6 w-6 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold">Tu grupo</h2>
                <p className="text-muted-foreground text-sm">Podés invitar a otros después con un código</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["create", "join"] as const).map((action) => (
                  <button
                    key={action}
                    onClick={() => setGroupAction(action)}
                    className={`border-2 rounded-xl p-3 text-center transition-all ${
                      groupAction === action
                        ? "border-teal-600 bg-teal-50 dark:bg-teal-950/40"
                        : "border-muted hover:border-muted-foreground"
                    }`}
                  >
                    <p className="text-lg mb-0.5">{action === "create" ? "🏠" : "🔗"}</p>
                    <p className="text-sm font-semibold">{action === "create" ? "Crear grupo" : "Unirme"}</p>
                  </button>
                ))}
              </div>

              {groupAction === "create" ? (
                <div className="space-y-2">
                  <Label>Nombre del grupo</Label>
                  <Input
                    placeholder="Ej: Familia Bastias, Hogar, etc."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Código de invitación</Label>
                  <Input
                    placeholder="Ej: ABC123"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    autoFocus
                    className="font-mono tracking-widest text-center"
                  />
                  <p className="text-xs text-muted-foreground">Pedile el código al administrador del grupo</p>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Atrás
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleFinish}
                  disabled={saving || (groupAction === "create" ? !groupName.trim() : !inviteCode.trim())}
                >
                  {saving ? "Guardando..." : "Empezar"} {!saving && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>

              <button
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleFinish}
                disabled={saving}
              >
                Saltar por ahora
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
