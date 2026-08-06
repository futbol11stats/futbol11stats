export const revalidate = 2592000
export const dynamicParams = true

import type { Metadata } from 'next'
import FichaJugadorV2 from '@/components/ficha/v2/FichaJugadorV2'
import { getJugadorV2 } from '@/lib/jugadorV2'
import { codFromSlug, jugadorSlug, formatNombre } from '@/lib/jugador'

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('es-ES')

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cod = codFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const j = await getJugadorV2(cod)
  if (!j) return { title: 'Jugador no encontrado | Fútbol11Stats' }
  const nombre = formatNombre(j.nombre)
  const canonical = `/madrid/jugador/${jugadorSlug(j.codjugador, j.nombre)}/v2`
  const title = `${nombre} — ficha, jornada a jornada y trayectoria | Fútbol11Stats`
  const description = `${nombre}: ${num(j.pj_total)} partidos, ${num(j.goles_total)} goles, ELO, forma y ` +
    `trayectoria completa en el fútbol amateur de Madrid.`
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'profile' } }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cod = codFromSlug(slug)
  return <FichaJugadorV2 cod={cod} temporadaLabel={null} />
}
