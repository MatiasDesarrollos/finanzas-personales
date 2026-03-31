import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, DollarSign, PiggyBank, TrendingUp } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Finanzas Familia</h1>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Ingresar</Button>
            </Link>
            <Link href="/register">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Gestiona las finanzas de tu familia
          </h2>
          <p className="text-lg text-muted-foreground">
            Controla ingresos, gastos y ahorros mensuales. Visualiza todo en pesos
            o dolares con el tipo de cambio BNA actualizado.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Comenzar <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <Card>
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-10 w-10 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Ingresos y Gastos</h3>
              <p className="text-sm text-muted-foreground">
                Registra cada movimiento con categorias personalizadas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <PiggyBank className="h-10 w-10 mx-auto mb-4 text-blue-600" />
              <h3 className="font-semibold mb-2">Objetivos de Ahorro</h3>
              <p className="text-sm text-muted-foreground">
                Crea metas y hace seguimiento de tu progreso
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-10 w-10 mx-auto mb-4 text-purple-600" />
              <h3 className="font-semibold mb-2">Tipo de Cambio BNA</h3>
              <p className="text-sm text-muted-foreground">
                Ve tus ahorros en pesos o dolares con cotizacion actualizada
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
