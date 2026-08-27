export const revalidate = 2592000
export const dynamicParams = true
export function generateStaticParams() { return [] }  // ISR on-demand: 0 en build, se generan y CACHEAN en la 1a visita (revalidate 30d)

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import FichaJugadorV2 from '@/components/ficha/v2/FichaJugadorV2'
import { getJugadorV2 } from '@/lib/jugadorV2'
import { codFromSlug, jugadorSlug, formatNombre } from '@/lib/jugador'

// Vista por TEMPORADA de la ficha de jugador: cada temporada es una página indexable por derecho.
//  - canonical PROPIO apuntando a sí misma (no a la ficha base), para que sea indexable por derecho.
//  - title con la temporada, para que no compita con la ficha base.
//  - redirect 308 al slug canónico (paridad con la ruta base [slug]/page.tsx).

export async function generateMetadata({ params }: { params: Promise<{ slug: string; temporada: string }> }): Promise<Metadata> {
  const { slug, temporada } = await params
  const cod = codFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const j = await getJugadorV2(cod)
  if (!j) return { title: 'Jugador no encontrado | Fútbol11Stats' }
  const nombre = formatNombre(j.nombre)
  const canonical = `/madrid/jugador/${jugadorSlug(j.codjugador, j.nombre)}/${temporada}`
  const title = `${nombre} — temporada ${temporada} | Fútbol11Stats`
  const description = `${nombre} en ${temporada}: partidos jornada a jornada, forma, goles, ELO y análisis del ` +
    `fútbol aficionado de Madrid.`
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'profile' } }
}

export default async function Page({ params }: { params: Promise<{ slug: string; temporada: string }> }) {
  const { slug, temporada } = await params
  const cod = codFromSlug(slug)
  const j = cod ? await getJugadorV2(cod) : null
  if (!j) notFound()

  // 308 a la URL canónica si el sufijo de nombre no coincide (conserva el segmento de temporada).
  const canonicalSlug = jugadorSlug(j.codjugador, j.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/madrid/jugador/${canonicalSlug}/${temporada}`)

  return <FichaJugadorV2 cod={cod} temporadaLabel={temporada} />
}
