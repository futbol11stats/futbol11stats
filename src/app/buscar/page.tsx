import type { Metadata } from 'next'
import BuscarClient from '@/components/buscador/BuscarClient'
import { getSueloVivo } from '@/lib/temporadas'

// Página de búsqueda: NO debe indexarse (contenido dinámico por query), pero sí seguir enlaces.
export const metadata: Metadata = {
  title: 'Buscar jugadores y equipos | Fútbol11Stats',
  description: 'Busca cualquier jugador o equipo del fútbol amateur de Madrid en Fútbol11Stats.',
  robots: { index: false, follow: true },
}

export default async function BuscarPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  // Suelo vivo (badge activo/inactivo) resuelto en el servidor y pasado al cliente como número serializable.
  const suelo = await getSueloVivo()
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      <BuscarClient initialQ={q ?? ''} suelo={suelo} />
    </div>
  )
}
