import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

async function getGrupo(codgrupo: string) {
  const { data } = await supabase
    .from('web_grupos')
    .select('*')
    .eq('codgrupo', codgrupo)
    .order('codtemporada', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getClasificacion(codgrupo: string, codtemporada: number) {
  const { data } = await supabase
    .from('web_clasificacion')
    .select('*')
    .eq('codgrupo', codgrupo)
    .eq('codtemporada', codtemporada)
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
    .in('tipo', ['goleadores_temp', 'fantasy_temp', 'elo_temp'])
    .order('rank')
  return data || []
}

// El codgrupo cambia cada temporada para el mismo grupo (nombre_comp + nombre_grupo).
// Devuelve un mapa codtemporada -> codgrupo para que el selector enlace al grupo correcto.
async function getGruposPorTemporada(nombreComp: string, nombreGrupo: string) {
  // nombre_grupo varía en capitalización entre temporadas (p.ej. 'Grupo 7' vs
  // 'GRUPO 7'), así que comparamos sin distinción de mayúsculas con ilike.
  const { data } = await supabase
    .from('web_grupos')
    .select('codtemporada, codgrupo')
    .eq('nombre_comp', nombreComp)
    .ilike('nombre_grupo', nombreGrupo)
  const map: Record<number, string> = {}
  for (const g of data || []) {
    map[g.codtemporada] = String(g.codgrupo)
  }
  return map
}

export default async function GrupoPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string; codgrupo: string }>
  searchParams: Promise<{ temp?: string; tab?: string }>
}) {
  const { categoria, codgrupo } = await params
  const { temp, tab: tabParam } = await searchParams

  const grupo = await getGrupo(codgrupo)
  if (!grupo) notFound()

  const codtemporada = temp ? parseInt(temp) : grupo.codtemporada
  const tab = tabParam || 'clasificacion'

  // Mapa codtemporada -> codgrupo para el selector (mismo grupo, distinto codgrupo por temporada)
  const gruposPorTemp = await getGruposPorTemporada(grupo.nombre_comp, grupo.nombre_grupo)

  const [clasificacion, resultados, topJugadores] = await Promise.all([
    getClasificacion(codgrupo, codtemporada),
    getResultados(codgrupo, codtemporada, grupo.jornada_actual),
    getTopJugadores(codgrupo, codtemporada),
  ])

  const goleadores = topJugadores.filter(j => j.tipo === 'goleadores_temp')
  const fantasy = topJugadores.filter(j => j.tipo === 'fantasy_temp')

  const TABS = [
    { id: 'clasificacion', label: 'Clasificación' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'goleadores', label: 'Goleadores' },
    { id: 'fantasy', label: 'Fantasy' },
  ]

  const TEMPORADAS = [
    { cod: 21, nombre: '2025-26' },
    { cod: 20, nombre: '2024-25' },
    { cod: 19, nombre: '2023-24' },
    { cod: 18, nombre: '2022-23' },
    { cod: 17, nombre: '2021-22' },
  ]

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
          <p className="text-grass-400 text-xs font-semibold uppercase tracking-widest mb-1">{grupo.nombre_historico || grupo.nombre_comp}</p>
          <h1 className="font-display text-4xl font-bold text-white">{grupo.nombre_grupo}</h1>
          {grupo.nombre_historico && (
            <p className="text-chalk-600 text-xs mt-1.5 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Actualmente denominada {grupo.nombre_comp}
            </p>
          )}
          <p className="text-chalk-600 text-sm mt-1">Jornada {grupo.jornada_actual}</p>
        </div>
        {/* Selector de temporada — enlaza al codgrupo correcto de cada temporada */}
        <div className="flex gap-1.5 flex-wrap">
          {TEMPORADAS.map(t => {
            const codgrupoTemp = gruposPorTemp[t.cod]
            // El grupo no existió en esta temporada: opción deshabilitada
            if (!codgrupoTemp) {
              return (
                <span
                  key={t.cod}
                  title="Sin datos en esta temporada"
                  className="text-xs px-3 py-1.5 rounded-md bg-pitch-800 text-chalk-700 opacity-40 cursor-not-allowed"
                >
                  {t.nombre}
                </span>
              )
            }
            return (
              <Link
                key={t.cod}
                href={`/madrid/${categoria}/${codgrupoTemp}?temp=${t.cod}&tab=${tab}`}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  codtemporada === t.cod
                    ? 'bg-grass-500 text-white font-semibold'
                    : 'bg-pitch-700 text-chalk-600 hover:text-white'
                }`}
              >
                {t.nombre}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-pitch-700 mb-6 flex gap-1">
        {TABS.map(t => (
          <Link
            key={t.id}
            href={`/madrid/${categoria}/${codgrupo}?temp=${codtemporada}&tab=${t.id}`}
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
        <ClasificacionTab rows={clasificacion} />
      )}
      {tab === 'resultados' && (
        <ResultadosTab resultados={resultados} jornada={grupo.jornada_actual} />
      )}
      {tab === 'goleadores' && (
        <JugadoresTab jugadores={goleadores} tipo="goleadores" />
      )}
      {tab === 'fantasy' && (
        <JugadoresTab jugadores={fantasy} tipo="fantasy" />
      )}
    </div>
  )
}

function ClasificacionTab({ rows }: { rows: any[] }) {
  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left">Equipo</th>
            <th>PJ</th>
            <th>PG</th>
            <th>PE</th>
            <th>PP</th>
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th className="text-grass-400">Pts</th>
            <th className="hidden md:table-cell">ELO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.codequipo} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{row.pos}</td>
              <td className="font-medium text-white">{row.nombre_equipo}</td>
              <td className="text-center text-chalk-600">{row.pj}</td>
              <td className="text-center">{row.pg}</td>
              <td className="text-center text-chalk-600">{row.pe}</td>
              <td className="text-center text-chalk-600">{row.pp}</td>
              <td className="text-center text-chalk-600">{row.gf}</td>
              <td className="text-center text-chalk-600">{row.gc}</td>
              <td className="text-center text-chalk-600">{row.dg > 0 ? `+${row.dg}` : row.dg}</td>
              <td className="text-center font-bold text-white">{row.pts}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell text-xs">{Math.round(row.elo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResultadosTab({ resultados, jornada }: { resultados: any[]; jornada: number }) {
  return (
    <div>
      <h3 className="text-chalk-600 text-sm mb-4">Jornada {jornada}</h3>
      <div className="space-y-2">
        {resultados.map(r => (
          <div key={r.codacta} className="bg-pitch-800 rounded-xl border border-pitch-700 px-4 py-3 flex items-center gap-4">
            <span className="text-white font-medium flex-1 text-right text-sm">{r.nombre_local}</span>
            <div className="flex items-center gap-2 min-w-[80px] justify-center">
              <span className="font-display text-2xl font-bold text-white">{r.goles_local}</span>
              <span className="text-chalk-600">–</span>
              <span className="font-display text-2xl font-bold text-white">{r.goles_visitante}</span>
            </div>
            <span className="text-white font-medium flex-1 text-sm">{r.nombre_visitante}</span>
          </div>
        ))}
        {resultados.length === 0 && (
          <p className="text-chalk-600 text-sm text-center py-8">No hay resultados para esta jornada</p>
        )}
      </div>
    </div>
  )
}

function JugadoresTab({ jugadores, tipo }: { jugadores: any[]; tipo: string }) {
  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left">Jugador</th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            <th className="hidden md:table-cell">Pos.</th>
            {tipo === 'goleadores' ? (
              <>
                <th className="text-grass-400">Goles</th>
                <th>PJ</th>
                <th className="hidden md:table-cell">Pts Fantasy</th>
              </>
            ) : (
              <>
                <th className="text-grass-400">Pts</th>
                <th>PJ</th>
                <th className="hidden md:table-cell">Media</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {jugadores.map(j => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{j.rank}</td>
              <td className="font-medium text-white">{j.nombre}</td>
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              <td className="text-center text-chalk-600 text-xs hidden md:table-cell">{j.posicion || '—'}</td>
              {tipo === 'goleadores' ? (
                <>
                  <td className="text-center font-bold text-white">{j.goles}</td>
                  <td className="text-center text-chalk-600">{j.pj}</td>
                  <td className="text-center text-chalk-600 hidden md:table-cell">{j.pts_fantasy}</td>
                </>
              ) : (
                <>
                  <td className="text-center font-bold text-white">{j.pts_fantasy}</td>
                  <td className="text-center text-chalk-600">{j.pj}</td>
                  <td className="text-center text-chalk-600 hidden md:table-cell">{j.media_fantasy?.toFixed(1)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
