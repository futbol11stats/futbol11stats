export const revalidate = 2592000  // ISR 30d (Fluid CPU free tier): contenido congelado en pretemporada; cada deploy/re-export invalida TODA la caché, así que los datos nuevos llegan igual. De ~4 regeneraciones/día/URL a 1 por deploy.

import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL, ensureMadrid, tabLabel } from '@/lib/seo'
import {
  COLS_CLASIFICACION, COLS_RESULTADOS, COLS_TOP_JUGADORES, COLS_ALERTAS,
  COLS_JUEGO_LIMPIO, COLS_XI_OPTIMO, COLS_EQUIPOS_FORMA, COLS_SUSPENDIDOS,
} from '@/lib/columns'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import { fichasExistentes } from '@/lib/jugador'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import JornadaSelector from '@/components/JornadaSelector'
import TabScroller from '@/components/TabScroller'
import {
  ClasificacionTab, ResultadosTab, JugadoresTab, EloTemporadaTab,
  PorterosTemporadaTab, TarjetasTemporadaTab, XiOptimoTemporadaTab,
  GoleadoresJornadaTab, TarjetasJornadaTab, Top5JugadoresTab,
  Top5EquiposTab, XiOptimoJornadaTab, SuspendidosTab,
} from '@/components/tablas'

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
  const { data } = await query.limit(1).single()
  return data
}

// Mismo grupo en otras temporadas (mismo nombre_comp + nombre_grupo, consistentes
// entre temporadas), con el slug propio de cada temporada para construir su URL.
async function getVariantesPorTemporada(nombreComp: string, nombreGrupo: string) {
  const { data } = await supabase
    .from('web_grupos')
    .select('codtemporada, slug_comp, slug_grupo, jornada_actual')
    .eq('nombre_comp', nombreComp)
    .ilike('nombre_grupo', nombreGrupo)
  const map: Record<number, { slug_comp: string; slug_grupo: string; jornada_actual: number }> = {}
  for (const g of data || []) {
    map[g.codtemporada] = {
      slug_comp: g.slug_comp,
      slug_grupo: g.slug_grupo,
      jornada_actual: g.jornada_actual,
    }
  }
  return map
}

// Grupos de la misma competición (para navegar entre ellos)
async function getGruposCompeticion(nombreComp: string, codtemporada: number) {
  const { data } = await supabase
    .from('web_grupos')
    .select('slug_grupo, nombre_grupo, slug_comp, codgrupo')
    .eq('nombre_comp', nombreComp)
    .eq('codtemporada', codtemporada)
  const sorted = (data || []).sort((a, b) => {
    const numA = parseInt(a.nombre_grupo.replace(/\D/g, '')) || 0
    const numB = parseInt(b.nombre_grupo.replace(/\D/g, '')) || 0
    return numA - numB
  })
  return sorted
}

// Destacados por jornada (web_top_jugadores: mvp_jornada, goleadores_jornada, ...)
async function getDestacadosJornada(codgrupo: string, codtemporada: number, jornada: number, tipo: string) {
  const { data } = await supabase
    .from('web_top_jugadores')
    .select(COLS_TOP_JUGADORES)
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .eq('tipo', tipo)
    .order('rank')
  return data || []
}

// Equipos en forma por jornada (web_equipos_forma)
async function getEquiposForma(codgrupo: string, codtemporada: number, jornada: number) {
  const { data } = await supabase
    .from('web_equipos_forma')
    .select(COLS_EQUIPOS_FORMA)
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .order('rank')
  return data || []
}

async function getClasificacion(codgrupo: string, codtemporada: number, jornada: number) {
  const { data } = await supabase
    .from('web_clasificacion')
    .select(COLS_CLASIFICACION)
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .order('pos')
  return data || []
}

async function getResultados(codgrupo: string, codtemporada: number, jornada: number) {
  const { data } = await supabase
    .from('web_resultados')
    .select(COLS_RESULTADOS)
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .order('fecha')
  return data || []
}

// Snapshot de TEMPORADA con fallback de 2 eslabones (la "máquina del tiempo"):
//   1) jornada = N seleccionada (acumulado J1->N; copa T21/T22 con snapshots)
//   2) si vacío -> jornada IS NULL (foto final; temporadas congeladas T17-T20 o sin snapshot)
// Garantiza que ninguna combinación (grupo, jornada) devuelva vacío si el grupo tiene datos.
async function fetchSnapshot(build: (q: any) => any, jornada: number) {
  const exact = await build(supabase).eq('jornada', jornada)
  if (exact.data && exact.data.length > 0) return exact.data
  const foto = await build(supabase).is('jornada', null)
  return foto.data || []
}

async function getTopJugadores(codgrupo: string, codtemporada: number, jornada: number) {
  // goleadores/fantasy/porteros rebobinan por jornada (snapshot). elo_temp NO tiene histórico por
  // jornada (es el ELO vigente, foto-final; coherente con el fix de ELO del pipeline y con la vista
  // global): se pide siempre jornada IS NULL, así la tab ELO no rebobina y nunca sale vacía en las
  // jornadas con snapshot (donde fetchSnapshot no caería al foto-final).
  const [snap, elo] = await Promise.all([
    fetchSnapshot((q) => q
      .from('web_top_jugadores').select(COLS_TOP_JUGADORES)
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada)
      .in('tipo', ['goleadores_temp', 'fantasy_temp', 'porteros_temp'])
      .order('rank'), jornada),
    supabase.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada)
      .eq('tipo', 'elo_temp').is('jornada', null).order('rank'),
  ])
  return [...snap, ...(elo.data || [])]
}

// Sancionados (alertas): FOTO-FINAL siempre — fuera del time-machine (se acumula demasiado).
// No filtra por jornada; lee el estado a fecha actual (foto-final, jornada=MAX por grupo).
async function getAlertasTarjetas(codgrupo: string, codtemporada: number) {
  const { data } = await supabase
    .from('web_alertas_tarjetas').select(COLS_ALERTAS)
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada)
  return data || []
}

async function getJuegoLimpio(codgrupo: string, codtemporada: number, jornada: number) {
  return fetchSnapshot((q) => q
    .from('web_juego_limpio').select(COLS_JUEGO_LIMPIO)
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada), jornada)
}

async function getXiOptimoTemporada(codgrupo: string, codtemporada: number, jornada: number) {
  return fetchSnapshot((q) => q
    .from('web_xi_optimo').select(COLS_XI_OPTIMO).eq('tipo', 'temporada')
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada)
    .order('pos_orden'), jornada)
}

async function getSuspendidosJornada(codgrupo: string, codtemporada: number, jornada: number) {
  const { data } = await supabase
    .from('web_suspendidos')
    .select(COLS_SUSPENDIDOS)
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .order('nombre_equipo')
  return data || []
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
  const grupo = await getGrupoBySlug(categoria, slug_comp, slug_grupo, codtemporada)
  if (!grupo) return { title: 'Fútbol11Stats' }

  const comp = ensureMadrid(grupo.nombre_comp)          // no duplica "Madrid" (ligas ya lo llevan)
  const grp = grupo.nombre_grupo ? ` ${grupo.nombre_grupo}` : ''
  const tl = tabLabel(tab)
  const title = `${tl} · ${comp}${grp} ${temporada} | Fútbol11Stats`
  const description = `${tl} de ${comp}${grp}, temporada ${temporada}. Clasificación, resultados, goleadores, tarjetas y estadísticas del fútbol amateur de Madrid en Fútbol11Stats.`
  // Canonical: toda jornada apunta a la jornada actual (máxima) -> mata la duplicación del time-machine.
  const canonical = `/madrid/${categoria}/${slug_comp}/${slug_grupo}/${temporada}/jornada-${grupo.jornada_actual}/${tab}`

  return {
    title,
    description,
    alternates: { canonical },
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

  const grupo = await getGrupoBySlug(categoria, slug_comp, slug_grupo, codtemporada)
  if (!grupo) notFound()

  // Copa/playoff: sin clasificación (eliminatoria); scope de competición fusionando rondas.
  const isCopa = !!grupo.tipo && grupo.tipo !== 'LIGA'

  const jornadaNum = parseInt(jornada.replace('jornada-', '')) || grupo.jornada_actual

  const cg = grupo.codgrupo
  // Tab efectivo (para gatear los fetch): en copa, cualquier tab que no exista cae a 'resultados'.
  const COPA_TABS = new Set([
    'resultados', 'goleadores-jornada', 'tarjetas-jornada', 'top5-jugadores-jornada', 'once-optimo-jornada',
    'top10-goleadores-temporada', 'top10-porteros-temporada', 'top10-tarjetas-temporada',
    'top10-fantasy-temporada', 'once-optimo-temporada',
  ])
  const tab2 = isCopa && !COPA_TABS.has(tab) ? 'resultados' : tab

  // Comunes del layout: selector de temporada (siempre) + nav de grupos hermanos (solo liga).
  const [variantes, gruposComp] = await Promise.all([
    getVariantesPorTemporada(grupo.nombre_comp, grupo.nombre_grupo),
    isCopa ? Promise.resolve([] as any[]) : getGruposCompeticion(grupo.nombre_comp, codtemporada),
  ])

  // TAB-GATING: cada render solo pide los datos de SU tab (+ los comunes de arriba), como ya hace
  // la vista global. Antes se disparaban las 15 queries en todos los renders.
  let clasificacion: any[] = []
  let resultados: any[] = []
  let goleadores: any[] = [], fantasy: any[] = [], eloJugadores: any[] = [], porteros: any[] = []
  let golesJ: any[] = [], tarjetasJ: any[] = [], mvpJ: any[] = [], xiJ: any[] = []
  let equiposForma: any[] = [], alertasTarjetas: any[] = [], xiOptimo: any[] = []
  let suspendidos: any[] = [], juegoLimpio: any[] = [], xiRondaCopa: any[] = []

  if (tab2 === 'clasificacion') {
    clasificacion = await getClasificacion(cg, codtemporada, jornadaNum)
  } else if (tab2 === 'resultados') {
    resultados = await getResultados(cg, codtemporada, jornadaNum)
  } else if (
    tab2 === 'top10-goleadores-temporada' || tab2 === 'top10-fantasy-temporada' ||
    tab2 === 'top10-elo-jugadores-temporada' || tab2 === 'top10-porteros-temporada'
  ) {
    const top = await getTopJugadores(cg, codtemporada, jornadaNum)
    goleadores = top.filter((j: any) => j.tipo === 'goleadores_temp')
    fantasy = top.filter((j: any) => j.tipo === 'fantasy_temp')
    eloJugadores = top.filter((j: any) => j.tipo === 'elo_temp')
    porteros = top.filter((j: any) => j.tipo === 'porteros_temp')
  } else if (tab2 === 'goleadores-jornada') {
    golesJ = await getDestacadosJornada(cg, codtemporada, jornadaNum, 'goleadores_jornada')
  } else if (tab2 === 'tarjetas-jornada') {
    const [s, t] = await Promise.all([
      getSuspendidosJornada(cg, codtemporada, jornadaNum),
      isCopa ? Promise.resolve([] as any[]) : getDestacadosJornada(cg, codtemporada, jornadaNum, 'tarjetas_jornada'),
    ])
    suspendidos = s
    tarjetasJ = t
  } else if (tab2 === 'top5-jugadores-jornada') {
    mvpJ = await getDestacadosJornada(cg, codtemporada, jornadaNum, 'mvp_jornada')
  } else if (tab2 === 'top5-equipos-jornada') {
    equiposForma = await getEquiposForma(cg, codtemporada, jornadaNum)
  } else if (tab2 === 'once-optimo-jornada') {
    if (isCopa) {
      const { data } = await supabase.from('web_xi_optimo').select(COLS_XI_OPTIMO)
        .eq('codgrupo', cg).eq('codtemporada', codtemporada)
        .eq('tipo', 'jornada').eq('jornada', jornadaNum).order('pos_orden')
      xiRondaCopa = data || []
    } else {
      xiJ = await getDestacadosJornada(cg, codtemporada, jornadaNum, 'xi_jornada')
    }
  } else if (tab2 === 'top10-tarjetas-temporada') {
    const [al, jl] = await Promise.all([
      getAlertasTarjetas(cg, codtemporada),
      getJuegoLimpio(cg, codtemporada, jornadaNum),
    ])
    alertasTarjetas = al
    juegoLimpio = jl
  } else if (tab2 === 'once-optimo-temporada') {
    xiOptimo = await getXiOptimoTemporada(cg, codtemporada, jornadaNum)
  }

  // ENLAZADO A FICHAS: qué codjugadores de esta página tienen ficha (query barata, una sola vez).
  // Solo en aficionados; en juveniles ni se consulta (esos jugadores no están en web_jugador).
  const codjugsPagina = [
    ...goleadores, ...fantasy, ...eloJugadores, ...porteros, ...golesJ, ...tarjetasJ,
    ...mvpJ, ...xiJ, ...alertasTarjetas, ...xiOptimo, ...suspendidos, ...xiRondaCopa,
  ].map((j: any) => j.codjugador)
  const fichas = categoria === 'juveniles' ? null : await fichasExistentes(codjugsPagina)

  // Copa/playoff: eliminatoria (sin clasificación ni Top-5 Equipos/forma — no aplica en knockout).
  // La ronda seleccionada gobierna AMBOS bloques (jornada = esa ronda; temporada = acumulado J1->ronda).
  const TABS_JORNADA = isCopa
    ? [
        { id: 'resultados',              label: 'Resultados' },
        { id: 'goleadores-jornada',      label: 'Goleadores' },
        { id: 'tarjetas-jornada',        label: 'Tarjetas' },
        { id: 'top5-jugadores-jornada',  label: 'Top 5 Jugadores' },
        { id: 'once-optimo-jornada',     label: 'XI Óptimo' },
      ]
    : [
        { id: 'clasificacion',           label: 'Clasificación' },
        { id: 'resultados',              label: 'Resultados' },
        { id: 'goleadores-jornada',      label: 'Goleadores' },
        { id: 'tarjetas-jornada',        label: 'Tarjetas' },
        { id: 'top5-jugadores-jornada',  label: 'Top 5 Jugadores' },
        { id: 'top5-equipos-jornada',    label: 'Top 5 Equipos' },
        { id: 'once-optimo-jornada',     label: 'XI Óptimo' },
      ]
  const TABS_TEMPORADA = isCopa
    ? [
        { id: 'top10-goleadores-temporada', label: 'Goleadores' },
        { id: 'top10-porteros-temporada',   label: 'Porteros' },
        { id: 'top10-tarjetas-temporada',   label: 'Tarjetas' },
        { id: 'top10-fantasy-temporada',    label: 'Fantasy' },
        { id: 'once-optimo-temporada',      label: 'XI Óptimo' },
      ]
    : [
        { id: 'top10-goleadores-temporada',    label: 'Goleadores' },
        { id: 'top10-porteros-temporada',      label: 'Porteros' },
        { id: 'top10-tarjetas-temporada',      label: 'Tarjetas' },
        { id: 'top10-fantasy-temporada',       label: 'Fantasy' },
        { id: 'top10-elo-jugadores-temporada', label: 'ELO' },
        { id: 'once-optimo-temporada',         label: 'XI Óptimo' },
      ]
  const TEMPORADAS = [21, 20, 19, 18, 17]

  // Base de URL sin jornada ni tab (para el selector de jornada)
  const baseUrl = `/madrid/${categoria}/${slug_comp}/${slug_grupo}/${temporada}`
  // Base de URL para los enlaces de tabs (misma temporada/jornada, cambia el tab)
  const baseTab = `${baseUrl}/jornada-${jornadaNum}`
  // Tabs que existen en la vista GLOBAL (resultados/goleadores-jornada/tarjetas-jornada son
  // exclusivos de grupo). Al pulsar "Global" se conserva el tab actual si existe allí; si no,
  // fallback a clasificación.
  const GLOBAL_TABS = new Set([
    'clasificacion', 'top5-jugadores-jornada', 'top5-equipos-jornada', 'once-optimo-jornada',
    'top10-goleadores-temporada', 'top10-porteros-temporada', 'top10-tarjetas-temporada',
    'top10-fantasy-temporada', 'top10-elo-jugadores-temporada', 'once-optimo-temporada',
  ])
  const globalTab = GLOBAL_TABS.has(tab) ? tab : 'clasificacion'

  // BreadcrumbList (JSON-LD) con URLs canónicas (www). Copa: sin nivel de grupo ni global.
  const catLabel = categoria === 'juveniles' ? 'Juveniles' : 'Aficionados'
  const jact = grupo.jornada_actual
  const gBase = `${SITE_URL}/madrid/${categoria}/${slug_comp}/${slug_grupo}/${temporada}`
  const crumbs: { name: string; url: string }[] = [
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: catLabel, url: `${SITE_URL}/madrid/${categoria}` },
  ]
  if (isCopa) {
    crumbs.push({ name: ensureMadrid(grupo.nombre_comp), url: `${gBase}/jornada-${jact}/resultados` })
  } else {
    crumbs.push({ name: ensureMadrid(grupo.nombre_comp), url: `${SITE_URL}/madrid/${categoria}/${slug_comp}/global/${temporada}/jornada-${jact}/clasificacion` })
    if (grupo.nombre_grupo) crumbs.push({ name: grupo.nombre_grupo, url: `${gBase}/jornada-${jact}/clasificacion` })
  }
  crumbs.push({ name: tabLabel(tab2), url: `${gBase}/jornada-${jact}/${tab}` })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <JsonLd data={graphLd(breadcrumbLd(crumbs))} />
      {/* Breadcrumb */}
      <nav className="text-sm text-chalk-600 mb-3 md:mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <Link href={`/madrid/${categoria}`} className="hover:text-white transition-colors capitalize">{categoria}</Link>
        <span>·</span>
        <span className="text-white">{grupo.nombre_comp}</span>
      </nav>

      {/* Header */}
      <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-white">{grupo.nombre_historico || grupo.nombre_comp}{grupo.nombre_grupo ? ` · ${grupo.nombre_grupo}` : ''}</h1>
          <p className="text-grass-400 text-sm mt-1">{isCopa ? 'Ronda' : 'Jornada'} {jornadaNum} · Temporada {temporada}</p>
          {grupo.nombre_historico && (
            <p className="text-chalk-600 text-xs mt-1.5 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Actualmente denominada {grupo.nombre_comp}
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
              totalJornadas={grupo.total_jornadas}
              baseUrl={baseUrl}
              tab={tab}
            />
            {jornadaNum < grupo.total_jornadas ? (
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
            // El grupo no existió en esta temporada: opción deshabilitada
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
                href={`/madrid/${categoria}/${v.slug_comp}/${v.slug_grupo}/${label}/jornada-${v.jornada_actual}/${tab}`}
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

      {/* Navegación: Global + grupos de la misma competición. En copa/playoff no aplica
          (scope único de competición, sin vista global ni grupos hermanos). */}
      {!isCopa && gruposComp.length > 0 && (
        <div className="scroll-row gap-1.5 mb-3 md:mb-6">
          <Link
            href={`/madrid/${categoria}/${slug_comp}/global/${temporada}/jornada-${jornadaNum}/${globalTab}`}
            className="text-xs px-3 py-1.5 rounded-md transition-colors bg-pitch-700 text-chalk-200 hover:bg-grass-500 hover:text-white"
          >
            Global
          </Link>
          {gruposComp.map(g => (
            <Link
              key={g.codgrupo}
              href={`/madrid/${categoria}/${g.slug_comp}/${g.slug_grupo}/${temporada}/jornada-${jornadaNum}/${tab}`}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                String(g.codgrupo) === String(grupo.codgrupo)
                  ? 'bg-grass-500 text-white font-semibold'
                  : 'bg-pitch-700 text-chalk-200 hover:bg-grass-500 hover:text-white'
              }`}
            >
              {g.nombre_grupo}
            </Link>
          ))}
        </div>
      )}

      {/* Tabs — JORNADA */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-1">Jornada</p>
      <TabScroller className="scroll-row border-b border-pitch-700 gap-1 mb-3 md:mb-4">
        {TABS_JORNADA.map(t => (
          <Link
            key={t.id}
            data-active={tab2 === t.id ? 'true' : undefined}
            href={`${baseTab}/${t.id}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab2 ===t.id
                ? 'border-grass-400 text-white'
                : 'border-transparent text-chalk-600 hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </TabScroller>

      {/* Tabs — TEMPORADA (en copa: acumulado hasta la ronda seleccionada) */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-1">
        {isCopa ? `Acumulado · hasta Ronda ${jornadaNum}` : 'Temporada'}
      </p>
      <TabScroller className="scroll-row border-b border-pitch-700 gap-1 mb-4 md:mb-6">
        {TABS_TEMPORADA.map(t => (
          <Link
            key={t.id}
            data-active={tab2 === t.id ? 'true' : undefined}
            href={`${baseUrl}/jornada-${jornadaNum}/${t.id}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab2 ===t.id
                ? 'border-grass-400 text-white'
                : 'border-transparent text-chalk-600 hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </TabScroller>

      {/* Contenido por tab */}
      {tab2 ==='clasificacion' && (
        <ClasificacionTab rows={clasificacion} jornadaNum={jornadaNum} totalJornadas={grupo.total_jornadas} />
      )}
      {tab2 ==='resultados' && (
        <ResultadosTab resultados={resultados} jornada={jornadaNum} />
      )}
      {tab2 ==='top10-goleadores-temporada' && (
        <JugadoresTab jugadores={goleadores} tipo="goleadores" fichas={fichas} />
      )}
      {tab2 ==='top10-fantasy-temporada' && (
        <JugadoresTab jugadores={fantasy} tipo="fantasy" fichas={fichas} />
      )}
      {tab2 ==='top10-elo-jugadores-temporada' && (
        <EloTemporadaTab jugadores={eloJugadores} fichas={fichas} />
      )}
      {tab2 ==='goleadores-jornada' && (
        <GoleadoresJornadaTab jugadores={golesJ} fichas={fichas} />
      )}
      {tab2 ==='tarjetas-jornada' && (
        <>
          <SuspendidosTab jugadores={suspendidos} umbral={isCopa ? 3 : 5} fichas={fichas} />
          <div className="mt-8" />
          {!isCopa && <TarjetasJornadaTab jugadores={tarjetasJ} fichas={fichas} />}
        </>
      )}
      {tab2 ==='top5-jugadores-jornada' && (
        <Top5JugadoresTab jugadores={mvpJ} fichas={fichas} />
      )}
      {tab2 ==='top5-equipos-jornada' && (
        <Top5EquiposTab equipos={equiposForma} />
      )}
      {tab2 ==='once-optimo-jornada' && (
        isCopa ? <XiOptimoTemporadaTab jugadores={xiRondaCopa} fichas={fichas} /> : <XiOptimoJornadaTab jugadores={xiJ} fichas={fichas} />
      )}
      {tab2 ==='top10-porteros-temporada' && (
        <PorterosTemporadaTab jugadores={porteros} fichas={fichas} />
      )}
      {tab2 ==='top10-tarjetas-temporada' && (
        <TarjetasTemporadaTab equipos={juegoLimpio} jugadores={alertasTarjetas} fichas={fichas} />
      )}
      {tab2 ==='once-optimo-temporada' && (
        <XiOptimoTemporadaTab jugadores={xiOptimo} fichas={fichas} />
      )}
    </div>
  )
}
