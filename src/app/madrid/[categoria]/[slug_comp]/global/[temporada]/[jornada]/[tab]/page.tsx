export const revalidate = 2592000  // ISR 30d (Fluid CPU free tier): contenido congelado en pretemporada; cada deploy/re-export invalida TODA la caché, así que los datos nuevos llegan igual. De ~4 regeneraciones/día/URL a 1 por deploy.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SITE_URL, ensureMadrid, tabLabel, noindexJuvenil, descripcionCompeticion } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import { nombreOficial } from '@/lib/sellos'
import FichaCompeticionGlobalV2 from '@/components/ficha/v2/FichaCompeticionGlobalV2'
import { slugToCod } from '@/lib/temporadaSlug'

// La vista GLOBAL de competición la renderiza FichaCompeticionGlobalV2. Este page.tsx conserva generateMetadata
// (canonical con colapso jornada→actual + noindex juvenil) y emite el JSON-LD breadcrumb: los componentes de
// competición no lo emiten, y el breadcrumb depende de la URL canónica (la conoce la ruta, no el componente).
// getCompeticion se mantiene (metadata + crumbs); los datos del render los trae FichaCompeticionGlobalV2.
// La temporada (slug<->cod) se resuelve con slugToCod (fórmula, sin lista topada): T22 y siguientes solas.

// El segmento [categoria] de la URL ('aficionados'|'juveniles') mapea a la
// columna categoria de la BD ('AFICIONADO'|'JUVENIL').
const CATEGORIA_MAP: Record<string, string> = {
  aficionados: 'AFICIONADO',
  juveniles: 'JUVENIL',
}

async function getCompeticion(slugComp: string, categoria: string, codtemporada: number) {
  let query = supabase
    .from('web_grupos')
    .select('nombre_comp, nombre_historico, total_jornadas, jornada_actual')
    .eq('slug_comp', slugComp)
    .eq('codtemporada', codtemporada)
  const cat = CATEGORIA_MAP[categoria]
  if (cat) query = query.eq('categoria', cat)
  const { data, error } = await query.limit(1).maybeSingle()
  if (error) throw error   // maybeSingle: sin filas -> data null (404 legítimo); error real -> throw (no congelar un 404)
  return data
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    categoria: string
    slug_comp: string
    temporada: string
    jornada: string
    tab: string
  }>
}): Promise<Metadata> {
  const { categoria, slug_comp, temporada, tab } = await params
  const codtemporada = slugToCod(temporada)
  if (!codtemporada) return { title: 'Fútbol11Stats' }
  const competicion = await getCompeticion(slug_comp, categoria, codtemporada)
  if (!competicion) return { title: 'Fútbol11Stats' }

  const comp = nombreOficial(competicion.nombre_comp) ?? ensureMadrid(competicion.nombre_comp)
  const tl = tabLabel(tab)
  const title = `${tl} · ${comp} Global ${temporada} | Fútbol11Stats`
  const description = descripcionCompeticion(tab, comp, temporada, true)
  const canonical = `/madrid/${categoria}/${slug_comp}/global/${temporada}/jornada-${competicion.jornada_actual}/${tab}`

  return {
    title,
    description,
    alternates: { canonical },
    // JUVENIL: noindex en las pestañas globales que listan jugadores (menores); clasificación no.
    ...(noindexJuvenil(categoria, tab) ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website' },
  }
}

export default async function GlobalPage({
  params,
}: {
  params: Promise<{
    categoria: string
    slug_comp: string
    temporada: string
    jornada: string
    tab: string
  }>
}) {
  const { categoria, slug_comp, temporada, jornada, tab } = await params

  const codtemporada = slugToCod(temporada)
  if (!codtemporada) notFound()

  const competicion = await getCompeticion(slug_comp, categoria, codtemporada)
  if (!competicion) notFound()

  // BreadcrumbList (JSON-LD) con URLs canónicas (www). El time-machine se colapsa a la jornada ACTUAL.
  const catLabel = categoria === 'juveniles' ? 'Juveniles' : 'Aficionados'
  const jact = competicion.jornada_actual
  const gBase = `${SITE_URL}/madrid/${categoria}/${slug_comp}/global/${temporada}`
  const crumbs = [
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: catLabel, url: `${SITE_URL}/madrid/${categoria}` },
    { name: `${ensureMadrid(competicion.nombre_comp)} · Global`, url: `${gBase}/jornada-${jact}/clasificacion` },
    { name: tabLabel(tab), url: `${gBase}/jornada-${jact}/${tab}` },
  ]

  return (
    <>
      <JsonLd data={graphLd(breadcrumbLd(crumbs))} />
      <FichaCompeticionGlobalV2 categoria={categoria} slugComp={slug_comp} temporada={temporada} jornada={jornada} tab={tab} />
    </>
  )
}
