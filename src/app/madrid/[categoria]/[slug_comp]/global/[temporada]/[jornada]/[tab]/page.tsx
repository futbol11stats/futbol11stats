export const revalidate = 2592000  // ISR 30d (Fluid CPU free tier): contenido congelado en pretemporada; cada deploy/re-export invalida TODA la caché, así que los datos nuevos llegan igual. De ~4 regeneraciones/día/URL a 1 por deploy.

import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL, ensureMadrid, tabLabel } from '@/lib/seo'
import {
  COLS_CLASIFICACION, COLS_TOP_JUGADORES, COLS_ALERTAS,
  COLS_JUEGO_LIMPIO, COLS_XI_OPTIMO, COLS_EQUIPOS_FORMA,
} from '@/lib/columns'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import JornadaSelector from '@/components/JornadaSelector'
import TabScroller from '@/components/TabScroller'
import { ZONA_BG, ZONA_LEYENDA, ARRASTRE_TIPOS, EscudoCell, TarjetasTemporadaTab, JugadoresTab, EloTemporadaTab, PorterosTemporadaTab, Top5JugadoresTab, Top5EquiposTab, XiOptimoTemporadaTab, XiOptimoJornadaTab } from '@/components/tablas'

const TEMPORADA_MAP: Record<string, number> = {
  '2021-22': 17,
  '2022-23': 18,
  '2023-24': 19,
  '2024-25': 20,
  '2025-26': 21,
}
const COD_TO_LABEL: Record<number, string> = Object.fromEntries(
  Object.entries(TEMPORADA_MAP).map(([label, cod]) => [cod, label])
)

// El segmento [categoria] de la URL ('aficionados'|'juveniles') mapea a la
// columna categoria de la BD ('AFICIONADO'|'JUVENIL').
const CATEGORIA_MAP: Record<string, string> = {
  aficionados: 'AFICIONADO',
  juveniles: 'JUVENIL',
}

// Datos de la competición (cualquier grupo sirve: nombre y total de jornadas son comunes).
async function getCompeticion(slugComp: string, categoria: string, codtemporada: number) {
  let query = supabase
    .from('web_grupos')
    .select('nombre_comp, nombre_historico, total_jornadas, jornada_actual')
    .eq('slug_comp', slugComp)
    .eq('codtemporada', codtemporada)
  const cat = CATEGORIA_MAP[categoria]
  if (cat) query = query.eq('categoria', cat)
  const { data } = await query.limit(1).single()
  return data
}

// Todos los grupos de la competición.
async function getGruposComp(slugComp: string, categoria: string, codtemporada: number) {
  let query = supabase
    .from('web_grupos')
    .select('codgrupo, nombre_grupo, slug_grupo')
    .eq('slug_comp', slugComp)
    .eq('codtemporada', codtemporada)
  const cat = CATEGORIA_MAP[categoria]
  if (cat) query = query.eq('categoria', cat)
  const { data } = await query
  const sorted = (data || []).sort((a, b) => {
    const numA = parseInt(a.nombre_grupo.replace(/\D/g, '')) || 0
    const numB = parseInt(b.nombre_grupo.replace(/\D/g, '')) || 0
    return numA - numB
  })
  return sorted
}

// Mismo torneo en otras temporadas (por nombre_comp), con su slug propio por temporada.
async function getVariantesComp(nombreComp: string, categoria: string) {
  let query = supabase
    .from('web_grupos')
    .select('codtemporada, slug_comp, jornada_actual')
    .eq('nombre_comp', nombreComp)
  const cat = CATEGORIA_MAP[categoria]
  if (cat) query = query.eq('categoria', cat)
  const { data } = await query
  const map: Record<number, { slug_comp: string; jornada_actual: number }> = {}
  for (const g of data || []) {
    // jornada_actual: nos quedamos con la mayor entre grupos de esa temporada
    const prev = map[g.codtemporada]
    if (!prev || g.jornada_actual > prev.jornada_actual) {
      map[g.codtemporada] = { slug_comp: g.slug_comp, jornada_actual: g.jornada_actual }
    }
  }
  return map
}

// Ranking global de la competición: web_top_jugadores de TODOS los grupos para un tipo.
// (Usada por los tabs cuando dejen de mostrar «Próximamente».)
async function getTopJugadoresGlobal(slugComp: string, categoria: string, codtemporada: number, tipo: string) {
  const grupos = await getGruposComp(slugComp, categoria, codtemporada)
  const codgrupos = grupos.map(g => String(g.codgrupo))
  if (codgrupos.length === 0) return []
  const { data } = await supabase
    .from('web_top_jugadores')
    .select(COLS_TOP_JUGADORES)
    .eq('codtemporada', codtemporada)
    .in('codgrupo', codgrupos)
    .eq('tipo', tipo)
    .order('rank')
  return data || []
}

// Snapshot GLOBAL con fallback (time-machine): fetch por-grupo a jornada=N; si vacío (temporada
// congelada) -> foto-final jornada IS NULL. La N gobierna el merge global (top-N por grupo por jornada).
async function fetchGlobalSnap(build: (q: any) => any, jornada: number) {
  const exact = await build(supabase).eq('jornada', jornada)
  if (exact.data && exact.data.length > 0) return exact.data
  const foto = await build(supabase).is('jornada', null)
  return foto.data || []
}

// Juego limpio global (rebobina por jornada). Sancionados globales -> foto-final (getAlertasGlobal).
async function getJuegoLimpioGlobal(codgrupos: string[], codtemporada: number, jornada: number) {
  if (codgrupos.length === 0) return []
  return fetchGlobalSnap((q) => q.from('web_juego_limpio').select(COLS_JUEGO_LIMPIO)
    .eq('codtemporada', codtemporada).in('codgrupo', codgrupos), jornada)
}

async function getAlertasGlobal(codgrupos: string[], codtemporada: number) {
  if (codgrupos.length === 0) return []
  const { data } = await supabase
    .from('web_alertas_tarjetas')
    .select(COLS_ALERTAS)
    .eq('codtemporada', codtemporada)
    .in('codgrupo', codgrupos)
  return data || []
}

// Ranking de temporada global: une los top-10 por grupo de un tipo (goleadores/porteros/
// fantasy/elo). Como el exporter guarda top-10 por grupo, el top-10 global está garantizado.
async function getTopGlobal(codgrupos: string[], codtemporada: number, tipo: string, jornada: number) {
  if (codgrupos.length === 0) return []
  // elo_temp no tiene snapshots por jornada -> siempre foto-final (jornada NULL).
  if (tipo === 'elo_temp') {
    const { data } = await supabase.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
      .eq('codtemporada', codtemporada).in('codgrupo', codgrupos).eq('tipo', tipo).is('jornada', null)
    return data || []
  }
  return fetchGlobalSnap((q) => q.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
    .eq('codtemporada', codtemporada).in('codgrupo', codgrupos).eq('tipo', tipo), jornada)
}

// Destacado de jornada global (mvp_jornada): top-5 por grupo de la jornada -> merge -> top 5.
async function getMvpGlobal(codgrupos: string[], codtemporada: number, jornada: number) {
  if (codgrupos.length === 0) return []
  const { data } = await supabase
    .from('web_top_jugadores')
    .select(COLS_TOP_JUGADORES)
    .eq('codtemporada', codtemporada)
    .in('codgrupo', codgrupos)
    .eq('tipo', 'mvp_jornada')
    .eq('jornada', jornada)
  return data || []
}

// Equipos en forma de la jornada global (web_equipos_forma).
async function getEquiposFormaGlobal(codgrupos: string[], codtemporada: number, jornada: number) {
  if (codgrupos.length === 0) return []
  const { data } = await supabase
    .from('web_equipos_forma')
    .select(COLS_EQUIPOS_FORMA)
    .eq('codtemporada', codtemporada)
    .in('codgrupo', codgrupos)
    .eq('jornada', jornada)
  return data || []
}

// XI óptimo global de la competición (web_xi_optimo tipo='temporada_global'/'jornada_global',
// calculado en el pipeline con normalización/selección sobre toda la competición).
async function getXiGlobal(codgrupos: string[], codtemporada: number, tipo: string, jornada?: number) {
  if (codgrupos.length === 0) return []
  let q = supabase.from('web_xi_optimo').select(COLS_XI_OPTIMO)
    .eq('codtemporada', codtemporada).in('codgrupo', codgrupos).eq('tipo', tipo)
  if (jornada != null) q = q.eq('jornada', jornada)
  const { data } = await q.order('pos_orden')
  return data || []
}

// Clasificación de un grupo en una jornada: solo las filas en zona (zona != '').
async function getClasificacionGrupo(codgrupo: string, codtemporada: number, jornada: number) {
  const { data } = await supabase
    .from('web_clasificacion')
    .select(COLS_CLASIFICACION)
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .order('pos')
  return (data || []).filter(r => r.zona && r.zona !== '')
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
  const codtemporada = TEMPORADA_MAP[temporada]
  if (!codtemporada) return { title: 'Fútbol11Stats' }
  const competicion = await getCompeticion(slug_comp, categoria, codtemporada)
  if (!competicion) return { title: 'Fútbol11Stats' }

  const comp = ensureMadrid(competicion.nombre_comp)
  const tl = tabLabel(tab)
  const title = `${tl} · ${comp} Global ${temporada} | Fútbol11Stats`
  const description = `${tl} global de ${comp} (todos los grupos), temporada ${temporada}. Clasificación, goleadores y estadísticas del fútbol amateur de Madrid en Fútbol11Stats.`
  const canonical = `/madrid/${categoria}/${slug_comp}/global/${temporada}/jornada-${competicion.jornada_actual}/${tab}`

  return {
    title,
    description,
    alternates: { canonical },
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

  const codtemporada = TEMPORADA_MAP[temporada]
  if (!codtemporada) notFound()

  const competicion = await getCompeticion(slug_comp, categoria, codtemporada)
  if (!competicion) notFound()

  const jornadaNum = parseInt(jornada.replace('jornada-', '')) || competicion.jornada_actual

  const [gruposComp, variantes] = await Promise.all([
    getGruposComp(slug_comp, categoria, codtemporada),
    getVariantesComp(competicion.nombre_comp, categoria),
  ])

  // Clasificación global: solo se carga en el tab clasificacion (todos los grupos en paralelo)
  const clasificaciones: Record<string, any[]> = {}
  if (tab === 'clasificacion') {
    const results = await Promise.all(
      gruposComp.map(g => getClasificacionGrupo(String(g.codgrupo), codtemporada, jornadaNum))
    )
    gruposComp.forEach((g, i) => { clasificaciones[String(g.codgrupo)] = results[i] })
  }

  // Badge de grupo por codgrupo (etiqueta + enlace a la vista del grupo conservando pestaña).
  const _gmap: Record<string, { nombre_grupo: string; slug_grupo: string }> = {}
  for (const g of gruposComp) _gmap[String(g.codgrupo)] = { nombre_grupo: g.nombre_grupo, slug_grupo: g.slug_grupo }
  const mkGrupo = (codgrupo: string) => {
    const g = _gmap[String(codgrupo)]
    return g ? { label: g.nombre_grupo, href: `/madrid/${categoria}/${slug_comp}/${g.slug_grupo}/${temporada}/jornada-${jornadaNum}/${tab}` } : undefined
  }

  // Tarjetas global (juego limpio + sancionados): unión de todos los grupos de la competición
  let juegoLimpio: any[] = []
  let alertasTarjetas: any[] = []
  if (tab === 'top10-tarjetas-temporada') {
    const codgrupos = gruposComp.map(g => String(g.codgrupo))
    const [jl, al] = await Promise.all([
      getJuegoLimpioGlobal(codgrupos, codtemporada, jornadaNum),
      getAlertasGlobal(codgrupos, codtemporada),   // sancionados: foto-final (fuera del time-machine)
    ])
    juegoLimpio = jl.map((r: any) => ({ ...r, grupo: mkGrupo(r.codgrupo) }))
    alertasTarjetas = al.map((r: any) => ({ ...r, grupo: mkGrupo(r.codgrupo) }))
  }

  // Rankings de temporada globales (top-10 de toda la competición). Orden y desempate =
  // exactamente los de la vista de grupo del exporter.
  const RANK_TIPO: Record<string, string> = {
    'top10-goleadores-temporada': 'goleadores_temp',
    'top10-porteros-temporada': 'porteros_temp',
    'top10-fantasy-temporada': 'fantasy_temp',
    'top10-elo-jugadores-temporada': 'elo_temp',
  }
  const RANK_CMP: Record<string, (a: any, b: any) => number> = {
    'top10-goleadores-temporada': (a, b) => (b.goles - a.goles) || ((b.pts_fantasy ?? 0) - (a.pts_fantasy ?? 0)),
    'top10-fantasy-temporada': (a, b) => (b.pts_fantasy ?? 0) - (a.pts_fantasy ?? 0),
    'top10-elo-jugadores-temporada': (a, b) => (b.elo ?? -1e9) - (a.elo ?? -1e9),
    'top10-porteros-temporada': (a, b) => (a.goles_pj ?? 1e9) - (b.goles_pj ?? 1e9),
  }
  let ranking: any[] = []
  if (RANK_TIPO[tab]) {
    const codgrupos = gruposComp.map(g => String(g.codgrupo))
    const rows = await getTopGlobal(codgrupos, codtemporada, RANK_TIPO[tab], jornadaNum)
    ranking = [...rows].sort(RANK_CMP[tab]).slice(0, 10).map((r, i) => ({
      ...r, rank: i + 1, grupo: mkGrupo(r.codgrupo),
    }))
  }

  // Destacados de jornada globales (top-5): mvp_jornada y equipos en forma. Orden = el del
  // exporter de grupo (pts_fantasy DESC).
  let mvpJ: any[] = []
  let equiposForma: any[] = []
  if (tab === 'top5-jugadores-jornada') {
    const codgrupos = gruposComp.map(g => String(g.codgrupo))
    const rows = await getMvpGlobal(codgrupos, codtemporada, jornadaNum)
    mvpJ = [...rows].sort((a, b) => (b.pts_fantasy ?? 0) - (a.pts_fantasy ?? 0)).slice(0, 5)
      .map((r, i) => ({ ...r, rank: i + 1, grupo: mkGrupo(r.codgrupo) }))
  } else if (tab === 'top5-equipos-jornada') {
    const codgrupos = gruposComp.map(g => String(g.codgrupo))
    const rows = await getEquiposFormaGlobal(codgrupos, codtemporada, jornadaNum)
    equiposForma = [...rows].sort((a, b) => (b.pts_fantasy ?? 0) - (a.pts_fantasy ?? 0)).slice(0, 5)
      .map((r, i) => ({ ...r, rank: i + 1, grupo: mkGrupo(r.codgrupo) }))
  }

  // XI óptimo globales (calculados en el pipeline; aquí solo se leen y se decoran con el badge).
  let xiTemp: any[] = []
  let xiJor: any[] = []
  if (tab === 'once-optimo-temporada') {
    const codgrupos = gruposComp.map(g => String(g.codgrupo))
    // XI global de temporada: rebobina por jornada con fallback a foto-final (jornada IS NULL).
    let rows = (await getXiGlobal(codgrupos, codtemporada, 'temporada_global', jornadaNum))
    if (rows.length === 0) rows = await getXiGlobal(codgrupos, codtemporada, 'temporada_global')
    xiTemp = rows.map(r => ({ ...r, grupo: mkGrupo(r.codgrupo) }))
  } else if (tab === 'once-optimo-jornada') {
    const codgrupos = gruposComp.map(g => String(g.codgrupo))
    const rows = await getXiGlobal(codgrupos, codtemporada, 'jornada_global', jornadaNum)
    xiJor = rows.map(r => ({ ...r, pts_fantasy: r.pts_jornada, grupo: mkGrupo(r.codgrupo) }))
  }

  const TABS_JORNADA = [
    { id: 'clasificacion',           label: 'Clasificación' },
    { id: 'top5-jugadores-jornada',  label: 'Top 5 Jugadores' },
    { id: 'top5-equipos-jornada',    label: 'Top 5 Equipos' },
    { id: 'once-optimo-jornada',     label: 'XI Óptimo' },
  ]
  const TABS_TEMPORADA = [
    { id: 'top10-goleadores-temporada',    label: 'Goleadores' },
    { id: 'top10-porteros-temporada',      label: 'Porteros' },
    { id: 'top10-tarjetas-temporada',      label: 'Tarjetas' },
    { id: 'top10-fantasy-temporada',       label: 'Fantasy' },
    { id: 'top10-elo-jugadores-temporada', label: 'ELO' },
    { id: 'once-optimo-temporada',         label: 'XI Óptimo' },
  ]

  const TEMPORADAS = [21, 20, 19, 18, 17]

  // Base de URL sin jornada ni tab (para el selector de jornada)
  const baseUrl = `/madrid/${categoria}/${slug_comp}/global/${temporada}`
  const baseTab = `${baseUrl}/jornada-${jornadaNum}`

  // BreadcrumbList (JSON-LD) con URLs canónicas (www).
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <JsonLd data={graphLd(breadcrumbLd(crumbs))} />
      {/* Breadcrumb */}
      <nav className="text-sm text-chalk-600 mb-3 md:mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <Link href={`/madrid/${categoria}`} className="hover:text-white transition-colors capitalize">{categoria}</Link>
        <span>·</span>
        <span className="text-white">{competicion.nombre_comp}</span>
        <span>·</span>
        <span className="text-grass-400">Global</span>
      </nav>

      {/* Header */}
      <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-white">{competicion.nombre_historico || competicion.nombre_comp} · Global</h1>
          <p className="text-grass-400 text-sm mt-1">Todos los grupos · Jornada {jornadaNum} · Temporada {temporada}</p>
          {competicion.nombre_historico && (
            <p className="text-chalk-600 text-xs mt-1.5 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Actualmente denominada {competicion.nombre_comp}
            </p>
          )}

          {/* Selector de jornada */}
          <div className="flex items-center gap-2 mt-2 md:mt-3">
            {jornadaNum > 1 ? (
              <Link
                href={`${baseUrl}/jornada-${jornadaNum - 1}/${tab}`}
                className="text-xs px-3 py-1.5 rounded-md bg-pitch-700 text-chalk-200 hover:bg-grass-500 hover:text-white transition-colors"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="text-xs px-3 py-1.5 rounded-md bg-pitch-800 text-chalk-700 opacity-40 cursor-not-allowed">
                ← Anterior
              </span>
            )}
            <JornadaSelector
              jornadaNum={jornadaNum}
              totalJornadas={competicion.total_jornadas}
              baseUrl={baseUrl}
              tab={tab}
            />
            {jornadaNum < competicion.total_jornadas ? (
              <Link
                href={`${baseUrl}/jornada-${jornadaNum + 1}/${tab}`}
                className="text-xs px-3 py-1.5 rounded-md bg-pitch-700 text-chalk-200 hover:bg-grass-500 hover:text-white transition-colors"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="text-xs px-3 py-1.5 rounded-md bg-pitch-800 text-chalk-700 opacity-40 cursor-not-allowed">
                Siguiente →
              </span>
            )}
          </div>
        </div>
        {/* Selector de temporada — enlaza a la variante (slug propio) de cada temporada */}
        <div className="scroll-row gap-1.5">
          {TEMPORADAS.map(cod => {
            const v = variantes[cod]
            const label = COD_TO_LABEL[cod]
            if (!v) {
              return (
                <span
                  key={cod}
                  title="Sin datos en esta temporada"
                  className="text-xs px-3 py-1.5 rounded-md bg-pitch-800 text-chalk-700 opacity-40 cursor-not-allowed"
                >
                  {label}
                </span>
              )
            }
            return (
              <Link
                key={cod}
                href={`/madrid/${categoria}/${v.slug_comp}/global/${label}/jornada-${v.jornada_actual}/${tab}`}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  codtemporada === cod
                    ? 'bg-grass-500 text-white font-semibold'
                    : 'bg-pitch-700 text-chalk-600 hover:text-white'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Navegación: Global + grupos de la competición */}
      <div className="scroll-row gap-1.5 mb-3 md:mb-6">
        <span className="text-xs px-3 py-1.5 rounded-md bg-grass-500 text-white font-semibold">Global</span>
        {gruposComp.map(g => (
          <Link
            key={g.codgrupo}
            /* la vista de grupo incluye todos los tabs de la global, así que se conserva el tab actual */
            href={`/madrid/${categoria}/${slug_comp}/${g.slug_grupo}/${temporada}/jornada-${jornadaNum}/${tab}`}
            className="text-xs px-3 py-1.5 rounded-md transition-colors bg-pitch-700 text-chalk-200 hover:bg-grass-500 hover:text-white"
          >
            {g.nombre_grupo}
          </Link>
        ))}
      </div>

      {/* Tabs — JORNADA */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-1">Jornada</p>
      <TabScroller className="scroll-row border-b border-pitch-700 gap-1 mb-3 md:mb-4">
        {TABS_JORNADA.map(t => (
          <Link
            key={t.id}
            data-active={tab === t.id ? 'true' : undefined}
            href={`${baseTab}/${t.id}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-grass-400 text-white'
                : 'border-transparent text-chalk-600 hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </TabScroller>

      {/* Tabs — TEMPORADA */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-1">Temporada</p>
      <TabScroller className="scroll-row border-b border-pitch-700 gap-1 mb-4 md:mb-6">
        {TABS_TEMPORADA.map(t => (
          <Link
            key={t.id}
            data-active={tab === t.id ? 'true' : undefined}
            href={`${baseUrl}/jornada-${jornadaNum}/${t.id}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-grass-400 text-white'
                : 'border-transparent text-chalk-600 hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </TabScroller>

      {/* Contenido por tab */}
      {tab === 'clasificacion' ? (
        <ClasificacionGlobalTab
          grupos={gruposComp}
          clasificaciones={clasificaciones}
          jornadaNum={jornadaNum}
          totalJornadas={competicion.total_jornadas}
        />
      ) : tab === 'top10-tarjetas-temporada' ? (
        <TarjetasTemporadaTab equipos={juegoLimpio} jugadores={alertasTarjetas} />
      ) : tab === 'top10-goleadores-temporada' ? (
        <JugadoresTab jugadores={ranking} tipo="goleadores" />
      ) : tab === 'top10-fantasy-temporada' ? (
        <JugadoresTab jugadores={ranking} tipo="fantasy" />
      ) : tab === 'top10-elo-jugadores-temporada' ? (
        <EloTemporadaTab jugadores={ranking} />
      ) : tab === 'top10-porteros-temporada' ? (
        <PorterosTemporadaTab jugadores={ranking} />
      ) : tab === 'top5-jugadores-jornada' ? (
        <Top5JugadoresTab jugadores={mvpJ} />
      ) : tab === 'top5-equipos-jornada' ? (
        <Top5EquiposTab equipos={equiposForma} />
      ) : tab === 'once-optimo-temporada' ? (
        <XiOptimoTemporadaTab jugadores={xiTemp} />
      ) : tab === 'once-optimo-jornada' ? (
        <XiOptimoJornadaTab jugadores={xiJor} />
      ) : (
        <p className="text-chalk-600 text-sm py-8 text-center">Próximamente</p>
      )}
    </div>
  )
}

function ClasificacionGlobalTab({
  grupos,
  clasificaciones,
  jornadaNum,
  totalJornadas,
}: {
  grupos: { codgrupo: string; nombre_grupo: string }[]
  clasificaciones: Record<string, any[]>
  jornadaNum: number
  totalJornadas: number
}) {
  const mostrarArrastre = jornadaNum >= totalJornadas
  const zonaEf = (z: string) => (!mostrarArrastre && ARRASTRE_TIPOS.has(z)) ? '' : z

  // Zonas presentes (efectivas) en cualquier grupo, para la leyenda
  const zonasPresentes = new Set<string>()
  for (const g of grupos) {
    for (const r of clasificaciones[g.codgrupo] || []) {
      const z = zonaEf(r.zona)
      if (z) zonasPresentes.add(z)
    }
  }
  const leyenda = ZONA_LEYENDA.filter(z => zonasPresentes.has(z.tipo))

  const Fila = ({ r, zona }: { r: any; zona: string }) => (
    <tr className="border-b border-pitch-700/50 last:border-0" style={ZONA_BG[zona]}>
      <td className="text-chalk-600 font-mono text-xs">{r.pos}</td>
      <EscudoCell escudo={r.escudo} nombre={r.nombre_equipo} />
      <td className="font-medium text-white">{r.nombre_equipo}</td>
      <td className="text-center text-chalk-600">{r.pj}</td>
      <td className="text-center font-bold text-white">{r.pts}</td>
    </tr>
  )

  return (
    <div className="space-y-6">
      {grupos.map(g => {
        const rows = (clasificaciones[g.codgrupo] || [])
          .map(r => ({ r, zona: zonaEf(r.zona) }))
          .filter(x => x.zona)
        if (rows.length === 0) return null
        return (
          <div key={g.codgrupo}>
            <p className="text-grass-400 text-xs font-semibold mb-2">{g.nombre_grupo}</p>
            <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-x-auto">
              <table className="w-full tabla-clasificacion">
                <thead>
                  <tr className="border-b border-pitch-700">
                    <th className="text-left w-8">#</th>
                    <th className="text-left w-10"></th>
                    <th className="text-left">Equipo</th>
                    <th>PJ</th>
                    <th className="text-grass-400">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(x => <Fila key={x.r.codequipo} r={x.r} zona={x.zona} />)}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      {leyenda.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {leyenda.map(z => (
            <span key={z.tipo} className="flex items-center gap-1.5 text-xs text-chalk-600">
              <span className="inline-block w-3 h-3 rounded-sm" style={ZONA_BG[z.tipo]} />
              {z.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
