export const revalidate = 21600  // ISR 6h: los datos solo cambian al re-exportar desde el pipeline

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import JornadaSelector from '@/components/JornadaSelector'
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
    .select('*')
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
    .select('*')
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .order('rank')
  return data || []
}

async function getClasificacion(codgrupo: string, codtemporada: number, jornada: number) {
  const { data } = await supabase
    .from('web_clasificacion')
    .select('*')
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .order('pos')
  return data || []
}

async function getResultados(codgrupo: string, codtemporada: number, jornada: number) {
  const { data } = await supabase
    .from('web_resultados')
    .select('*')
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .order('fecha')
  return data || []
}

async function getTopJugadores(codgrupo: string, codtemporada: number) {
  const { data } = await supabase
    .from('web_top_jugadores')
    .select('*')
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .in('tipo', ['goleadores_temp', 'fantasy_temp', 'elo_temp', 'porteros_temp'])
    .order('rank')
  return data || []
}

async function getAlertasTarjetas(codgrupo: string, codtemporada: number) {
  const { data } = await supabase
    .from('web_alertas_tarjetas')
    .select('*')
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
  return data || []
}

async function getJuegoLimpio(codgrupo: string, codtemporada: number) {
  const { data } = await supabase
    .from('web_juego_limpio')
    .select('*')
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
  return data || []
}

async function getXiOptimoTemporada(codgrupo: string, codtemporada: number) {
  const { data } = await supabase
    .from('web_xi_optimo')
    .select('*')
    .eq('tipo', 'temporada')
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .order('pos_orden')
  return data || []
}

async function getSuspendidosJornada(codgrupo: string, codtemporada: number, jornada: number) {
  const { data } = await supabase
    .from('web_suspendidos')
    .select('*')
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
    .eq('jornada', jornada)
    .order('nombre_equipo')
  return data || []
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

  const jornadaNum = parseInt(jornada.replace('jornada-', '')) || grupo.jornada_actual

  const [clasificacion, resultados, topJugadores, variantes, gruposComp,
         golesJ, tarjetasJ, mvpJ, xiJ, equiposForma, alertasTarjetas, xiOptimo, suspendidos, juegoLimpio] = await Promise.all([
    getClasificacion(grupo.codgrupo, codtemporada, jornadaNum),
    getResultados(grupo.codgrupo, codtemporada, jornadaNum),
    getTopJugadores(grupo.codgrupo, codtemporada),
    getVariantesPorTemporada(grupo.nombre_comp, grupo.nombre_grupo),
    getGruposCompeticion(grupo.nombre_comp, codtemporada),
    getDestacadosJornada(grupo.codgrupo, codtemporada, jornadaNum, 'goleadores_jornada'),
    getDestacadosJornada(grupo.codgrupo, codtemporada, jornadaNum, 'tarjetas_jornada'),
    getDestacadosJornada(grupo.codgrupo, codtemporada, jornadaNum, 'mvp_jornada'),
    getDestacadosJornada(grupo.codgrupo, codtemporada, jornadaNum, 'xi_jornada'),
    getEquiposForma(grupo.codgrupo, codtemporada, jornadaNum),
    getAlertasTarjetas(grupo.codgrupo, codtemporada),
    getXiOptimoTemporada(grupo.codgrupo, codtemporada),
    getSuspendidosJornada(grupo.codgrupo, codtemporada, jornadaNum),
    getJuegoLimpio(grupo.codgrupo, codtemporada),
  ])

  const goleadores = topJugadores.filter(j => j.tipo === 'goleadores_temp')
  const fantasy = topJugadores.filter(j => j.tipo === 'fantasy_temp')
  const eloJugadores = topJugadores.filter(j => j.tipo === 'elo_temp')
  const porteros = topJugadores.filter(j => j.tipo === 'porteros_temp')

  const TABS_JORNADA = [
    { id: 'clasificacion',           label: 'Clasificación' },
    { id: 'resultados',              label: 'Resultados' },
    { id: 'goleadores-jornada',      label: 'Goleadores' },
    { id: 'tarjetas-jornada',        label: 'Tarjetas' },
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-chalk-600 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <Link href={`/madrid/${categoria}`} className="hover:text-white transition-colors capitalize">{categoria}</Link>
        <span>·</span>
        <span className="text-white">{grupo.nombre_comp}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-white">{grupo.nombre_historico || grupo.nombre_comp} · {grupo.nombre_grupo}</h1>
          <p className="text-grass-400 text-sm mt-1">Jornada {jornadaNum} · Temporada {temporada}</p>
          {grupo.nombre_historico && (
            <p className="text-chalk-600 text-xs mt-1.5 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Actualmente denominada {grupo.nombre_comp}
            </p>
          )}

          {/* Selector de jornada */}
          <div className="flex items-center gap-2 mt-3">
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
        <div className="flex gap-1.5 flex-wrap">
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

      {/* Navegación: Global + grupos de la misma competición (siempre visible; el activo
          aquí es un grupo, así que "Global" va como enlace inactivo a la vista global) */}
      {gruposComp.length > 0 && (
        <div className="mb-6 flex gap-1.5 flex-wrap">
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
      <div className="border-b border-pitch-700 mb-4 flex gap-1 flex-wrap">
        {TABS_JORNADA.map(t => (
          <Link
            key={t.id}
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
      </div>

      {/* Tabs — TEMPORADA */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-1">Temporada</p>
      <div className="border-b border-pitch-700 mb-6 flex gap-1 flex-wrap">
        {TABS_TEMPORADA.map(t => (
          <Link
            key={t.id}
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
      </div>

      {/* Contenido por tab */}
      {tab === 'clasificacion' && (
        <ClasificacionTab rows={clasificacion} jornadaNum={jornadaNum} totalJornadas={grupo.total_jornadas} />
      )}
      {tab === 'resultados' && (
        <ResultadosTab resultados={resultados} jornada={jornadaNum} />
      )}
      {tab === 'top10-goleadores-temporada' && (
        <JugadoresTab jugadores={goleadores} tipo="goleadores" />
      )}
      {tab === 'top10-fantasy-temporada' && (
        <JugadoresTab jugadores={fantasy} tipo="fantasy" />
      )}
      {tab === 'top10-elo-jugadores-temporada' && (
        <EloTemporadaTab jugadores={eloJugadores} />
      )}
      {tab === 'goleadores-jornada' && (
        <GoleadoresJornadaTab jugadores={golesJ} />
      )}
      {tab === 'tarjetas-jornada' && (
        <>
          <SuspendidosTab jugadores={suspendidos} />
          <div className="mt-8" />
          <TarjetasJornadaTab jugadores={tarjetasJ} />
        </>
      )}
      {tab === 'top5-jugadores-jornada' && (
        <Top5JugadoresTab jugadores={mvpJ} />
      )}
      {tab === 'top5-equipos-jornada' && (
        <Top5EquiposTab equipos={equiposForma} />
      )}
      {tab === 'once-optimo-jornada' && (
        <XiOptimoJornadaTab jugadores={xiJ} />
      )}
      {tab === 'top10-porteros-temporada' && (
        <PorterosTemporadaTab jugadores={porteros} />
      )}
      {tab === 'top10-tarjetas-temporada' && (
        <TarjetasTemporadaTab equipos={juegoLimpio} jugadores={alertasTarjetas} />
      )}
      {tab === 'once-optimo-temporada' && (
        <XiOptimoTemporadaTab jugadores={xiOptimo} />
      )}
    </div>
  )
}
