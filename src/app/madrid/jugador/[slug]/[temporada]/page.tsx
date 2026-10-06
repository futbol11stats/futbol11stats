// RENDER DINÁMICO SIN CACHÉ DE RUTA (2026-10-07). Medido sobre la factura: estas páginas se escribían
// ~16,6 veces al mes y se leían ~1,9, así que la caché ISR no cacheaba nada — solo pagaba la prima de
// escritura. Los ~4,2M de writes que desaparecen NO eran renders extra: eran renders que ya ocurrían y que
// además se guardaban. Lo único que se añade son los ~483k aciertos de caché que ahora sí renderizan.
// Orden de magnitud del neto: unos 20 $/mes a favor (tarifa MEDIA de la factura, no marginal; las líneas
// del Pro llevan franquicia, así que el ahorro real es mayor).
//
// LA CACHÉ DE DATOS SIGUE INTACTA: `unstable_cache` dentro de los getters funciona igual en una ruta
// dinámica (precedente en el repo: /campos y /clubes ya son force-dynamic y usan cacheIndices), con su TTL
// de 30 días y SUS MISMOS TAGS — comp:/temporada:/jugador: no cambian. Lo único que deja de guardarse es el
// HTML. De hecho la cobertura mejora: una página que se renderiza siempre no puede quedarse rancia por un
// tag que no se emitió.
// SEO sin cambios: mismo HTML, mismo 200, `noindex` intacto (vive en generateMetadata), y ni el sitemap ni
// los enlaces internos dependían de la caché — estas dos rutas YA se generaban bajo demanda.
export const dynamic = 'force-dynamic'

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
