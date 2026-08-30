export const revalidate = 2592000
export const dynamicParams = true
export function generateStaticParams() { return [] }  // ISR on-demand: 0 en build, se cachean en la 1ª visita

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPartido } from '@/lib/partido'
import { partidoSlug, idFromPartidoSlug } from '@/lib/partidoSlug'
import { equipoHref } from '@/lib/equipo'
import { escudoUrl } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd, sportsEventLd } from '@/lib/jsonld'
import FichaPartidoV2 from '@/components/ficha/FichaPartidoV2'

// Fecha ISO para startDate del SportsEvent: 'DD/MM/YYYY' (+ 'HH:MM') -> 'YYYY-MM-DD' (+ 'THH:MM').
function fechaIso(fecha: string | null, hora: string | null): string | null {
  if (!fecha || !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) return null
  const iso = `${fecha.slice(6, 10)}-${fecha.slice(3, 5)}-${fecha.slice(0, 2)}`
  return hora && /^\d{1,2}:\d{2}$/.test(hora) && hora !== '00:00' ? `${iso}T${hora.padStart(5, '0')}` : iso
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const id = idFromPartidoSlug(slug)
  if (!id) return { title: 'Fútbol11Stats' }
  const p = await getPartido(id)
  if (!p) return { title: 'Partido no encontrado | Fútbol11Stats' }
  const canonical = `/madrid/partido/${partidoSlug(p.id, p.local.nombre, p.visitante.nombre)}`
  const marcador = p.jugado ? `${p.golesLocal}-${p.golesVisitante}` : 'vs'
  const rama = p.categoria === 'juveniles' ? 'juvenil' : 'aficionado'
  const title = `${p.local.nombre} ${marcador} ${p.visitante.nombre} · J${p.jornada} ${p.nombreComp} ${p.temporada} | Fútbol11Stats`
  const description = p.jugado
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
  const id = idFromPartidoSlug(slug)
  if (!id) notFound()
  const p = await getPartido(id)
  if (!p) notFound()

  const canonicalSlug = partidoSlug(p.id, p.local.nombre, p.visitante.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/madrid/partido/${canonicalSlug}`)

  const url = `${SITE_URL}/madrid/partido/${canonicalSlug}`
  const eventLd = sportsEventLd({
    local: p.local.nombre, visitante: p.visitante.nombre,
    localUrl: p.local.codequipo ? `${SITE_URL}${equipoHref(p.local.codequipo, p.local.nombre)}` : null,
    visitanteUrl: p.visitante.codequipo ? `${SITE_URL}${equipoHref(p.visitante.codequipo, p.visitante.nombre)}` : null,
    localLogo: escudoUrl(p.local.escudo), visitanteLogo: escudoUrl(p.visitante.escudo),
    golesLocal: p.golesLocal, golesVisitante: p.golesVisitante,
    fechaIso: fechaIso(p.fecha, p.hora), campo: p.campoNombre, campoLat: p.campoLat, campoLng: p.campoLng,
    competicion: `${p.nombreComp} · Jornada ${p.jornada} · ${p.temporada}`,
  })
  const crumbs = breadcrumbLd([
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: p.categoria === 'juveniles' ? 'Juveniles' : 'Aficionados', url: `${SITE_URL}/madrid/${p.categoria}` },
    { name: p.nombreComp, url: p.compHref },
    { name: `${p.local.nombre} - ${p.visitante.nombre}`, url },
  ])

  return (
    <>
      <JsonLd data={graphLd(eventLd, crumbs)} />
      <FichaPartidoV2 p={p} />
    </>
  )
}
