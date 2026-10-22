export const revalidate = 2592000  // ISR 30d (Fluid CPU free tier): contenido congelado en pretemporada; cada deploy/re-export invalida TODA la caché, así que los datos nuevos llegan igual. De ~4 regeneraciones/día/URL a 1 por deploy.

import type { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { tienePartidosJugados } from '@/lib/competicionV2'
import { SITE_URL, ensureMadrid, tabLabel, noindexTab, descripcionCompeticion, TABS_GRUPO_LIGA, TABS_GRUPO_COPA, OG_IMAGE } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import { nombreOficial, denominacion } from '@/lib/sellos'
import { FAMILIA_SLUGS, OLD_A_FAMILIA, familiaSlugGrupo, jornadaSegValida, type Ronda } from '@/lib/competiciones'
import FichaCompeticionV2 from '@/components/ficha/v2/FichaCompeticionV2'
import { slugToCod } from '@/lib/temporadaSlug'
import { getUltimaJornadaJugada } from '@/lib/ultimaJornada'

// La vista de GRUPO de competición la renderiza FichaCompeticionV2. Este page.tsx conserva generateMetadata
// (title/description/canonical con colapso jornada→actual + canonical de familia + noindex juvenil), el
// redirect 308 (copa-old-slug→familia) y emite el JSON-LD breadcrumb: los componentes de competición no lo
// emiten, y el breadcrumb depende de la URL canónica, que conoce la ruta, no el componente. getGrupoBySlug se
// mantiene: lo usan generateMetadata y la construcción de crumbs; los datos del render los trae el componente.
// La temporada (slug<->cod) se resuelve con slugToCod (fórmula, sin lista topada): T22 y siguientes solas.

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
  const { data, error } = await query
  if (error) throw error   // un error transitorio NO debe volverse null -> notFound() congelado como 404 en el route cache
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
  const codtemporada = slugToCod(temporada)
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
  const description = descripcionCompeticion(tab, `${comp}${grp}`, temporada)
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
    // noindex por DOS motivos sumados (ver noindexTab): privacidad en juvenil (pestañas con nombres de
    // menores) y audiencia cero en las once pestañas sin visitas. "follow" se mantiene: los enlaces
    // internos a clasificación y resultados siguen contando.
    ...(noindexTab(categoria, tab) ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website', images: [OG_IMAGE] },
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

  const codtemporada = slugToCod(temporada)
  if (!codtemporada) notFound()

  // FASE 3 — 308 de los slugs VIEJOS de copa/ronda a la familia canónica (misma temporada, ronda por
  // defecto). El slug de familia NO se redirige (se renderiza). Ninguna URL indexada queda en 404.
  const fam = OLD_A_FAMILIA[slug_comp]
  if (fam && !FAMILIA_SLUGS.has(slug_comp)) {
    permanentRedirect(`/madrid/${categoria}/${fam}/${familiaSlugGrupo(fam)}/${temporada}/final/${tab}`)
  }

  const grupo = await getGrupoBySlug(categoria, slug_comp, slug_grupo, codtemporada)
  if (!grupo) notFound()

  // LISTA BLANCA de pestaña + TOPE de jornada. Va DESPUÉS de resolver el grupo porque la lista depende del
  // tipo (liga/copa) y el tope de sus jornadas o rondas. Cierra el universo infinito: hasta ahora un tab
  // inventado devolvía 200 autocanónico y cualquier número de jornada devolvía 200.
  if (!(grupo.tipo && grupo.tipo !== 'LIGA' ? TABS_GRUPO_COPA : TABS_GRUPO_LIGA).has(tab)) notFound()
  if (!jornadaSegValida(jornada, grupo)) notFound()

  const isCopa = !!grupo.tipo && grupo.tipo !== 'LIGA'
  const rondas: Ronda[] = isCopa && Array.isArray(grupo.rondas) ? grupo.rondas : []
  const esFamilia = rondas.length > 0

  // PRETEMPORADA (liga sin partidos jugados): la entrada por defecto es jornada_actual (= final del calendario,
  // ya cargado) + clasificación. Se lleva al PRINCIPIO —J1 + resultados—, que es lo que se busca al empezar (los
  // emparejamientos de la 1ª jornada). Redirect TEMPORAL (mismo discriminante que la pastilla, tienePartidosJugados):
  // en cuanto haya un solo partido jugado deja de redirigir y abre en clasificación/última jornada como siempre.
  // Solo se dispara en la entrada por defecto (jornada actual + clasificación); ver clasificación en pretemporada
  // sigue siendo posible (su URL es jornada-1/clasificación, que no cumple la condición).
  if (!isCopa && tab === 'clasificacion') {
    const jactNum = grupo.jornada_actual || 1
    const jNum = parseInt(jornada.replace('jornada-', ''), 10) || jactNum
    if (jNum === jactNum && !(await tienePartidosJugados(grupo.codgrupo, codtemporada))) {
      redirect(`/madrid/${categoria}/${slug_comp}/${slug_grupo}/${temporada}/jornada-1/resultados`)
    }
  }

  // JORNADA SIN JUGAR -> 307 a la última jugada, en la MISMA pestaña.
  //
  // El problema: de los 2.830 pares grupo-jornada publicados de T22, 2.403 (el 85 %) no tienen ni un partido
  // jugado. Y la página no se vaciaba: `fetchSnapshot` rebobina a la jornada más cercana con dato, pero el
  // rótulo usa la jornada PEDIDA. Resultado: /jornada-20/clasificacion enseñaba la tabla de la J6 diciendo
  // "tras la jornada 20". El redirect no solo deduplica miles de URLs: deja de mentir.
  //
  // `resultados` SE QUEDA FUERA, y es la única. Las otras trece, ante una jornada sin jugar, o se vacían
  // (`.eq('jornada')` exacto), o enseñan otra con etiqueta falsa (rebobinan), o nunca miraron la jornada
  // (ELO de jugadores, estadísticas). `resultados` es la única cuyo contenido para una jornada futura es el
  // que el usuario venía a ver: los ENFRENTAMIENTOS. Redirigirla sería quitárselo.
  //
  // TEMPORAL (307), nunca 308: la jornada 7 no está jugada hoy y lo estará la semana que viene. Un 308 lo
  // cachean navegador y Google como definitivo y seguirían redirigiendo cuando ya no toca. (Esta ruta además
  // se sirve con `no-store` —es dinámica, sin generateStaticParams—, así que la decisión se toma en cada
  // petición y no hay caché de ruta que la congele. Lo que sí está cacheado es el DATO: ver lib/ultimaJornada.)
  //
  // SOLO JORNADAS FUTURAS (`>`): si la J4 se aplazó y ya se jugó la J6, pedir la J4 NO redirige. Empujar al
  // usuario hacia DELANTE sería peor que dejarle ver lo que pidió. La vista da la última jugada, no qué
  // jornadas concretas se jugaron, así que los huecos intermedios se quedan como están — decisión pendiente.
  //
  // COPA FUERA (`!isCopa`) y ruta GLOBAL fuera (es otro fichero): ver lib/ultimaJornada.
  if (!isCopa && tab !== 'resultados') {
    const jNum = parseInt(jornada.replace('jornada-', ''), 10) || (grupo.jornada_actual || 1)
    const ultima = await getUltimaJornadaJugada(grupo.codgrupo, codtemporada)
    const destino = ultima === undefined ? null                     // no se pudo saber -> no mover a nadie
      : ultima === null ? (jNum !== 1 ? 1 : null)                   // no ha jugado nada -> jornada 1
      : (jNum > ultima.jornada ? ultima.jornada : null)             // futura -> la última jugada
    if (destino != null) {
      redirect(`/madrid/${categoria}/${slug_comp}/${slug_grupo}/${temporada}/jornada-${destino}/${tab}`)
    }
  }

  // BreadcrumbList (JSON-LD) con URLs canónicas (www). Copa: sin nivel de grupo ni global. El 0 del
  // time-machine se colapsa a la jornada/ronda ACTUAL (segJact). tab2 normaliza los tabs de copa.
  const COPA_TABS = new Set([
    'clasificacion', 'resultados', 'goleadores-jornada', 'tarjetas-jornada', 'top5-jugadores-jornada', 'once-optimo-jornada',
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
