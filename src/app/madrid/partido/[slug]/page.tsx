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
import { getPartido } from '@/lib/partido'
import { partidoSlug, idFromPartidoSlug } from '@/lib/partidoSlug'
import { equipoHref } from '@/lib/equipo'
import { escudoUrl } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd, sportsEventLd } from '@/lib/jsonld'
import { isoMadrid } from '@/lib/horaMadrid'
import { getDireccionesCampos } from '@/lib/campo'
import FichaPartidoV2 from '@/components/ficha/FichaPartidoV2'

// El ISO con zona lo construye isoMadrid (lib/horaMadrid.ts). Antes se armaba aquí a mano y SIN zona — y
// además se devolvía la fecha sola cuando no había hora, que es lo que producía eventos sin startDate
// válido. Ahora, sin hora no hay evento.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const codacta = idFromPartidoSlug(slug)
  if (!codacta) return { title: 'Fútbol11Stats' }
  const p = await getPartido(codacta)
  if (!p) return { title: 'Partido no encontrado | Fútbol11Stats' }
  const canonical = `/madrid/partido/${partidoSlug(p.codacta, p.local.nombre, p.visitante.nombre)}`
  // SUSPENDIDO: ni marcador ni "vs". El "vs" anunciaba en el título y en las redes un partido por jugarse
  // que no se va a jugar; el guión más el rótulo dicen lo que hay.
  const susp = p.estadoPartido === 'suspendido'
  const marcador = susp ? '-' : p.jugado ? `${p.golesLocal}-${p.golesVisitante}` : 'vs'
  const rama = p.categoria === 'juveniles' ? 'juvenil' : 'aficionado'
  const title = `${p.local.nombre} ${marcador} ${p.visitante.nombre}${susp ? ' · Suspendido' : ''} · J${p.jornada} ${p.nombreComp} ${p.temporada} | Fútbol11Stats`
  const description = susp
    ? `${p.local.nombre} - ${p.visitante.nombre}, jornada ${p.jornada} de ${p.nombreComp} (${p.temporada}): partido SUSPENDIDO y pendiente de resolución, sin resultado. Fútbol ${rama} de Madrid en Fútbol11Stats.`
    : p.jugado
    ? `${p.local.nombre} ${p.golesLocal}-${p.golesVisitante} ${p.visitante.nombre}: alineaciones con los PUNTOS FANTASY de cada jugador, el MVP del partido y el cara a cara. Jornada ${p.jornada} de ${p.nombreComp} (${p.temporada}), fútbol ${rama} de Madrid.`
    : `${p.local.nombre} - ${p.visitante.nombre}, jornada ${p.jornada} de ${p.nombreComp} (${p.temporada}): fecha, hora, campo, historial entre ambos y añadir a tu calendario. Fútbol ${rama} de Madrid en Fútbol11Stats.`
  // NOINDEX: juveniles (menores), partidos SIN JUGAR (thin) y todo lo que no sea la temporada actual (T22, decisión
  // "solo temporada actual de momento"). Se indexan SOLO los jugados de aficionados de T22 (ricos y únicos por el
  // fantasy). follow:true para que el rastreo siga los enlaces.
  const noindex = p.esJuvenil || !p.jugado || p.codtemporada !== 22
  return {
    title, description, alternates: { canonical },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website' },
  }
}

export default async function PartidoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const codacta = idFromPartidoSlug(slug)
  if (!codacta) notFound()
  const p = await getPartido(codacta)
  if (!p) notFound()

  const canonicalSlug = partidoSlug(p.codacta, p.local.nombre, p.visitante.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/madrid/partido/${canonicalSlug}`)

  const url = `${SITE_URL}/madrid/partido/${canonicalSlug}`
  // Dirección postal del campo para location.address. Solo si el evento va a emitirse (fecha+hora+campo):
  // así no se gasta una lectura en los partidos que no llevan marcado.
  const startDate = isoMadrid(p.fecha, p.hora)
  const dir = startDate && p.campoNombre && p.codigoCampo
    ? (await getDireccionesCampos([p.codigoCampo])).get(p.codigoCampo) ?? null
    : null
  const eventLd = sportsEventLd({
    local: p.local.nombre, visitante: p.visitante.nombre,
    localUrl: p.local.codequipo ? `${SITE_URL}${equipoHref(p.local.codequipo, p.local.nombre)}` : null,
    visitanteUrl: p.visitante.codequipo ? `${SITE_URL}${equipoHref(p.visitante.codequipo, p.visitante.nombre)}` : null,
    localLogo: escudoUrl(p.local.escudo), visitanteLogo: escudoUrl(p.visitante.escudo),
    golesLocal: p.golesLocal, golesVisitante: p.golesVisitante,
    startDate, campo: p.campoNombre, campoCodigo: p.codigoCampo, campoLat: p.campoLat, campoLng: p.campoLng,
    campoDireccion: dir?.direccion ?? null, campoLocalidad: dir?.localidad ?? null, campoCp: dir?.cp ?? null,
    competicion: `${p.nombreComp} · ${p.temporada}`, competicionNombre: p.nombreComp,
    jornadaTexto: `Jornada ${p.jornada}`,
    incidencia: p.incidencia, estadoPartido: p.estadoPartido,
  })
  const crumbs = breadcrumbLd([
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: p.categoria === 'juveniles' ? 'Juveniles' : 'Aficionados', url: `${SITE_URL}/madrid/${p.categoria}` },
    { name: p.nombreComp, url: p.compHref },
    { name: `${p.local.nombre} - ${p.visitante.nombre}`, url },
  ])

  return (
    <>
      {/* El evento puede faltar (sin hora o sin campo): el grafo sale solo con las migas, que siempre valen. */}
      <JsonLd data={graphLd(...[eventLd, crumbs].filter((n) => n != null))} />
      <FichaPartidoV2 p={p} />
    </>
  )
}
