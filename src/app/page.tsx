import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowRight,
  BarChart3,
  PiggyBank,
  TrendingUp,
  Users,
  Smartphone,
  RefreshCw,
  Target,
  ShieldCheck,
  ChevronRight,
} from "lucide-react"

const features = [
  {
    icon: TrendingUp,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    title: "Ingresos y Gastos",
    desc: "Registrá cada movimiento con categorías personalizadas. Vista tipo recibo de sueldo — siempre sabés lo que te sobra.",
  },
  {
    icon: PiggyBank,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    title: "Objetivos de Ahorro",
    desc: "Creá metas con fecha límite, agrupá aportes por concepto y seguí el progreso con gráficos acumulativos.",
  },
  {
    icon: BarChart3,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    title: "Comparativo mensual",
    desc: "Gráfico interactivo con todos tus meses. Hacé clic en cualquier barra para ver el detalle de ese período.",
  },
  {
    icon: RefreshCw,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    title: "Gastos Fijos",
    desc: "Marcá alquiler, servicios o cuotas como fijos y copialos al siguiente mes con un solo clic.",
  },
  {
    icon: Users,
    color: "text-teal-600",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    title: "Grupos Familiares",
    desc: "Invitá a tu pareja o familia con un código. Verifiquen juntos los gastos compartidos y objetivos del hogar.",
  },
  {
    icon: Target,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    title: "Presupuestos",
    desc: "Definí un tope mensual por categoría y visualizá cuánto gastaste vs cuánto planeaste gastar.",
  },
]

const steps = [
  { n: "1", title: "Creá tu cuenta", desc: "Gratis, sin tarjeta. El onboarding tarda 2 minutos." },
  { n: "2", title: "Cargá tus movimientos", desc: "Ingresos, gastos y ahorros con fecha y categoría." },
  { n: "3", title: "Analizá tu situación", desc: "El dashboard te muestra tendencias y el sobrante del mes." },
]

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">Finanzas Familia</span>
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Ingresar</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Registrarse gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center bg-gradient-to-b from-blue-950/5 to-background">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-blue-200 dark:border-blue-800">
          <ShieldCheck className="h-3.5 w-3.5" />
          Gratis para uso personal
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl leading-tight">
          Las finanzas de tu familia,{" "}
          <span className="text-blue-600">bajo control</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
          Registrá ingresos, gastos y ahorros. Visualizá todo en ARS o USD con el tipo de cambio BNA. Trabajá solo o en grupo con tu familia.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/register">
            <Button size="lg" className="gap-2 text-base px-8">
              Empezar ahora <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-base px-8">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-5">
          Sin tarjeta de crédito · Datos en Argentina (Supabase) · Tipo de cambio BNA en tiempo real
        </p>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Todo lo que necesitás</h2>
            <p className="text-muted-foreground text-lg">Una sola app para tener el panorama completo de tus finanzas</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className={`inline-flex p-2.5 rounded-xl ${f.bg} mb-4`}>
                    <f.icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">En 3 pasos</h2>
            <p className="text-muted-foreground text-lg">Empezás a ver resultados desde el primer día</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-5 shadow-lg shadow-blue-200">
                  {s.n}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full mb-4 border border-blue-200 dark:border-blue-800">
              <Smartphone className="h-3.5 w-3.5" />
              PWA — Instalable
            </div>
            <h2 className="text-3xl font-bold mb-4">Funciona en el celu</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Instalala como una app nativa desde el navegador. Sin necesidad de App Store ni Google Play. Siempre disponible, incluso con conexión limitada.
            </p>
            <div className="space-y-2 text-sm">
              {["Diseño responsive para móvil y PC", "Instalable desde Chrome / Safari", "Acceso rápido desde la pantalla de inicio"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-muted-foreground">
                  <ChevronRight className="h-4 w-4 text-blue-600 shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-48 h-96 bg-card rounded-[2rem] border-4 border-muted-foreground/20 shadow-2xl flex items-center justify-center">
              <div className="text-center space-y-3 px-4">
                <PiggyBank className="h-12 w-12 text-blue-600 mx-auto" />
                <p className="text-sm font-semibold">Finanzas Familia</p>
                <p className="text-xs text-muted-foreground">Tu resumen del mes siempre en el bolsillo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-blue-950 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Listo para tomar el control?</h2>
          <p className="text-blue-200 text-lg mb-10">Creá tu cuenta gratis y empezá a registrar tus finanzas hoy mismo.</p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-blue-950 hover:bg-blue-50 gap-2 text-base px-10 font-semibold">
              Crear cuenta gratis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-center text-sm text-muted-foreground">
        <p>© 2026 Finanzas Familia · Hecho con ❤️ en Argentina · Tipo de cambio BNA</p>
      </footer>
    </div>
  )
}
