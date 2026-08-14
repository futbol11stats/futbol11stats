export const revalidate = 2592000
export const dynamicParams = true

import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
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
  // 308 a la URL canónica si el sufijo de nombre no coincide (paridad con la ruta actual, que la v2 había
  // perdido). Mientras la v2 vive en /v2 se conserva ese sufijo; el día de la migración desaparece y apunta
  // ya a la canónica. getJugadorV2 está cacheada (dedupe con generateMetadata en la misma request).
  if (cod) {
    const j = await getJugadorV2(cod)
    if (j) {
      const canonicalSlug = jugadorSlug(j.codjugador, j.nombre)
      if (slug !== canonicalSlug) permanentRedirect(`/madrid/jugador/${canonicalSlug}/v2`)
    }
  }
  return <FichaJugadorV2 cod={cod} temporadaLabel={null} suf="/v2" />
}
