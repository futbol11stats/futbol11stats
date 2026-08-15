export const revalidate = 2592000  // ISR 30d (Fluid CPU free tier): contenido congelado en pretemporada; cada deploy/re-export invalida TODA la caché, así que los datos nuevos llegan igual. De ~4 regeneraciones/día/URL a 1 por deploy.

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SITE_URL, ensureMadrid, tabLabel, noindexJuvenil } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import { nombreOficial, denominacion } from '@/lib/sellos'
import { FAMILIA_SLUGS, OLD_A_FAMILIA, familiaSlugGrupo, type Ronda } from '@/lib/competiciones'
import FichaCompeticionV2 from '@/components/ficha/v2/FichaCompeticionV2'

// Migración v2 (Opción A): esta ruta CANÓNICA (sin sufijo /v2) pasa a renderizar FichaCompeticionV2. Se
// conservan verbatim generateMetadata (title/description/canonical con colapso jornada→actual + canonical de
// familia + noindex juvenil), el redirect 308 (copa-old-slug→familia) y el JSON-LD breadcrumb. El JSON-LD lo
// SIGUE emitiendo el page.tsx a propósito: los componentes v2 de competición no lo emiten, y el breadcrumb
// depende de la URL canónica, que conoce la ruta, no el componente. Solo se retira el render inline y sus
// fetchers de datos (tab-gating): FichaCompeticionV2 trae sus propios datos. getGrupoBySlug se mantiene: lo
// usan generateMetadata y la construcción de crumbs. FichaCompeticionV2 recibe suf='' -> enlaces canónicos.

const TEMPORADA_MAP: Record<string, number> = {
  '2021-22': 17,
  '2022-23': 18,
  '2023-24': 19,
  '2024-25': 20,
  '2025-26': 21,
}

// El segmento [categoria] de la URL ('aficionados'|'juveniles') mapea a la
// columna categoria de la BD ('AFICIONADO'|'JUVENIL').
const CATEGORIA_MAP: Record<string, string> = {
  aficionados: 'AFICIONADO',
  juveniles: 'JUVENIL',
}

async function getGrupoBySlug(
  categoria: string,
  slugComp: string,
  slugGrupo: string,
  codtemporada: number,
) {
  let query = supabase
    .from('web_grupos')
    .select('*')
    .eq('slug_comp', slugComp)
    .eq('slug_grupo', slugGrupo)
    .eq('codtemporada', codtemporada)
  // Evita mezclar aficionados con juveniles (mismos slugs entre categorías).
  const cat = CATEGORIA_MAP[categoria]
  if (cat) query = query.eq('categoria', cat)
  const { data } = await query
  if (!data || !data.length) return null
  // Prefiere la fila de FAMILIA (codgrupo fam-*) cuando coexiste con una vieja del mismo slug (p.ej.
  // 'copa-rffm' es slug de familia Y hubo un grupo viejo homónimo).
  return (data as any[]).find((g) => String(g.codgrupo).startsWith('fam-')) ?? data[0]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    categoria: string
    slug_comp: string
    slug_grupo: string
    temporada: string
    jornada: string
    tab: string
  }>
}): Promise<Metadata> {
  const { categoria, slug_comp, slug_grupo, temporada, tab } = await params
  const codtemporada = TEMPORADA_MAP[temporada]
  if (!codtemporada) return { title: 'Fútbol11Stats' }
  // Slugs viejos: el canonical es el de la familia (la página hace el 308).
  const famMeta = OLD_A_FAMILIA[slug_comp]
  if (famMeta && !FAMILIA_SLUGS.has(slug_comp)) {
    return { alternates: { canonical: `/madrid/${categoria}/${famMeta}/${familiaSlugGrupo(famMeta)}/${temporada}/final/${tab}` } }
  }
  const grupo = await getGrupoBySlug(categoria, slug_comp, slug_grupo, codtemporada)
  if (!grupo) return { title: 'Fútbol11Stats' }

  const comp = nombreOficial(grupo.nombre_comp) ?? ensureMadrid(denominacion(grupo.nombre_comp))  // denominación oficial (3ªRFEF->Tercera Federación, Nacional Juvenil->Liga Nacional Juvenil)
  const grp = grupo.nombre_grupo ? ` ${grupo.nombre_grupo}` : ''
  const tl = tabLabel(tab)
  const title = `${tl} · ${comp}${grp} ${temporada} | Fútbol11Stats`
  const description = `${tl} de ${comp}${grp}, temporada ${temporada}. Clasificación, resultados, goleadores, tarjetas y estadísticas del fútbol amateur de Madrid en Fútbol11Stats.`
  // Canonical: toda ronda/jornada apunta a la actual (máxima) -> mata la duplicación del time-machine.
  // Copa por familia: el segmento canónico es el slug de la ronda por defecto.
  const rondasMeta: Ronda[] = grupo.tipo !== 'LIGA' && Array.isArray(grupo.rondas) ? grupo.rondas : []
  const segCanon = rondasMeta.length
    ? (rondasMeta.find((r) => r.idx === grupo.jornada_actual)?.slug || rondasMeta[rondasMeta.length - 1]?.slug || `jornada-${grupo.jornada_actual}`)
    : `jornada-${grupo.jornada_actual}`
  const canonical = `/madrid/${categoria}/${slug_comp}/${slug_grupo}/${temporada}/${segCanon}/${tab}`

  return {
    title,
    description,
    alternates: { canonical },
    // JUVENIL: noindex en las pestañas que listan jugadores (menores); clasificación/resultados no.
    ...(noindexJuvenil(categoria, tab) ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website' },
  }
}

export default async function GrupoPage({
  params,
}: {
  params: Promise<{
    categoria: string
    slug_comp: string
    slug_grupo: string
    temporada: string
    jornada: string
    tab: string
  }>
}) {
  const { categoria, slug_comp, slug_grupo, temporada, jornada, tab } = await params

  const codtemporada = TEMPORADA_MAP[temporada]
  if (!codtemporada) notFound()

  // FASE 3 — 308 de los slugs VIEJOS de copa/ronda a la familia canónica (misma temporada, ronda por
  // defecto). El slug de familia NO se redirige (se renderiza). Ninguna URL indexada queda en 404.
  const fam = OLD_A_FAMILIA[slug_comp]
  if (fam && !FAMILIA_SLUGS.has(slug_comp)) {
    permanentRedirect(`/madrid/${categoria}/${fam}/${familiaSlugGrupo(fam)}/${temporada}/final/${tab}`)
  }

  const grupo = await getGrupoBySlug(categoria, slug_comp, slug_grupo, codtemporada)
  if (!grupo) notFound()

  const isCopa = !!grupo.tipo && grupo.tipo !== 'LIGA'
  const rondas: Ronda[] = isCopa && Array.isArray(grupo.rondas) ? grupo.rondas : []
  const esFamilia = rondas.length > 0

  // BreadcrumbList (JSON-LD) con URLs canónicas (www). Copa: sin nivel de grupo ni global. El 0 del
  // time-machine se colapsa a la jornada/ronda ACTUAL (segJact). tab2 normaliza los tabs de copa.
  const COPA_TABS = new Set([
    'resultados', 'goleadores-jornada', 'tarjetas-jornada', 'top5-jugadores-jornada', 'once-optimo-jornada',
    'top10-goleadores-temporada', 'top10-porteros-temporada', 'top10-tarjetas-temporada',
    'top10-fantasy-temporada', 'once-optimo-temporada',
  ])
  const tab2 = isCopa && !COPA_TABS.has(tab) ? 'resultados' : tab
  const catLabel = categoria === 'juveniles' ? 'Juveniles' : 'Aficionados'
  const jact = grupo.jornada_actual
  const segJact = esFamilia
    ? (rondas.find((r) => r.idx === jact)?.slug || rondas[rondas.length - 1]?.slug || `jornada-${jact}`)
    : `jornada-${jact}`
  const gBase = `${SITE_URL}/madrid/${categoria}/${slug_comp}/${slug_grupo}/${temporada}`
  const crumbs: { name: string; url: string }[] = [
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: catLabel, url: `${SITE_URL}/madrid/${categoria}` },
  ]
  if (isCopa) {
    crumbs.push({ name: ensureMadrid(denominacion(grupo.nombre_comp)), url: `${gBase}/${segJact}/resultados` })
  } else {
    crumbs.push({ name: ensureMadrid(denominacion(grupo.nombre_comp)), url: `${SITE_URL}/madrid/${categoria}/${slug_comp}/global/${temporada}/jornada-${jact}/clasificacion` })
    if (grupo.nombre_grupo) crumbs.push({ name: grupo.nombre_grupo, url: `${gBase}/jornada-${jact}/clasificacion` })
  }
  crumbs.push({ name: tabLabel(tab2), url: `${gBase}/${segJact}/${tab}` })

  return (
    <>
      <JsonLd data={graphLd(breadcrumbLd(crumbs))} />
      <FichaCompeticionV2 categoria={categoria} slugComp={slug_comp} slugGrupo={slug_grupo} temporada={temporada} jornadaSeg={jornada} tab={tab} />
    </>
  )
}
