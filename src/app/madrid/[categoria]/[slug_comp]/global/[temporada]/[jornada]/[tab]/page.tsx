import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import JornadaSelector from '@/components/JornadaSelector'

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
    .select('*')
    .eq('codtemporada', codtemporada)
    .in('codgrupo', codgrupos)
    .eq('tipo', tipo)
    .order('rank')
  return data || []
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

  const TABS_JORNADA = [
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-chalk-600 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <Link href={`/madrid/${categoria}`} className="hover:text-white transition-colors capitalize">{categoria}</Link>
        <span>·</span>
        <span className="text-white">{competicion.nombre_comp}</span>
        <span>·</span>
        <span className="text-grass-400">Global</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
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
        <div className="flex gap-1.5 flex-wrap">
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
      <div className="mb-6 flex gap-1.5 flex-wrap">
        <span className="text-xs px-3 py-1.5 rounded-md bg-grass-500 text-white font-semibold">Global</span>
        {gruposComp.map(g => (
          <Link
            key={g.codgrupo}
            href={`/madrid/${categoria}/${slug_comp}/${g.slug_grupo}/${temporada}/jornada-${jornadaNum}/clasificacion`}
            className="text-xs px-3 py-1.5 rounded-md transition-colors bg-pitch-700 text-chalk-200 hover:bg-grass-500 hover:text-white"
          >
            {g.nombre_grupo}
          </Link>
        ))}
      </div>

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

      {/* Contenido por tab — pendiente de implementar */}
      <p className="text-chalk-600 text-sm py-8 text-center">Próximamente</p>
    </div>
  )
}
