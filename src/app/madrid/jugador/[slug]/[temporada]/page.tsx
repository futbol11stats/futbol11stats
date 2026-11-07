export const revalidate = 2592000
export const dynamicParams = true
export function generateStaticParams() { return [] }  // ISR on-demand: 0 en build, se generan y CACHEAN en la 1a visita (revalidate 30d)

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import FichaJugadorV2 from '@/components/ficha/v2/FichaJugadorV2'
import { getJugadorV2 } from '@/lib/jugadorV2'
import { codFromSlug, jugadorSlug, formatNombre } from '@/lib/jugador'
import { OG_IMAGE } from '@/lib/seo'

// Vista por TEMPORADA de la ficha de jugador.
//  - canonical a la FICHA PRINCIPAL (antes era propio): el Disallow de robots.txt para todo agente salvo
//    Googlebot y bingbot y el nofollow del selector sacan estas ~128k variantes del rastreo (cada visita de bot
//    = una escritura ISR); a esos dos se les sigue dejando entrar y el canonical consolida su señal en la ficha.
//    og:url sigue siendo la propia URL: lo que se comparte es la temporada.
//  - title con la temporada, para que no compita con la ficha base.
//  - redirect 308 al slug canónico (paridad con la ruta base [slug]/page.tsx).

export async function generateMetadata({ params }: { params: Promise<{ slug: string; temporada: string }> }): Promise<Metadata> {
  const { slug, temporada } = await params
  const cod = codFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const j = await getJugadorV2(cod)
  if (!j) return { title: 'Jugador no encontrado | Fútbol11Stats' }
  const nombre = formatNombre(j.nombre)
  const canonical = `/madrid/jugador/${jugadorSlug(j.codjugador, j.nombre)}`
  const url = `${canonical}/${temporada}`
  const title = `${nombre} — temporada ${temporada} | Fútbol11Stats`
  const description = `${nombre} en ${temporada}: partidos jornada a jornada, forma, goles, ELO y análisis del ` +
    `fútbol aficionado de Madrid.`
  return { title, description, alternates: { canonical }, openGraph: { title, description, url, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'profile', images: [OG_IMAGE] } }
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
