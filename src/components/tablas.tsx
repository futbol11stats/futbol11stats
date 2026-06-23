import type { CSSProperties } from 'react'
import { escudoUrl, formatNombre } from '@/lib/supabase'

export const ZONA_BG: Record<string, CSSProperties> = {
  ascenso_directo:      { backgroundColor: 'rgb(20,83,45)',   borderLeft: '4px solid rgb(34,197,94)'  },
  playoff_ascenso:      { backgroundColor: 'rgb(78,53,0)',    borderLeft: '4px solid rgb(234,179,8)'  },
  ascenso_arrastre:     { backgroundColor: 'rgb(60,40,0)',    borderLeft: '4px solid rgb(234,179,8)'  },
  descenso_directo:     { backgroundColor: 'rgb(83,20,20)',   borderLeft: '4px solid rgb(239,68,68)'  },
  descenso_coeficiente: { backgroundColor: 'rgb(60,15,15)',   borderLeft: '4px solid rgba(239,68,68,0.6)'  },
  descenso_arrastre:    { backgroundColor: 'rgb(60,15,15)',   borderLeft: '4px solid rgba(239,68,68,0.6)'  },
  filial_bloqueado:     { backgroundColor: 'rgb(30,58,138)',  borderLeft: '4px solid rgb(59,130,246)'  },
}

export const ZONA_LEYENDA: { tipo: string; label: string }[] = [
  { tipo: 'ascenso_directo',      label: 'Ascenso directo' },
  { tipo: 'playoff_ascenso',      label: 'Playoff ascenso' },
  { tipo: 'ascenso_arrastre',     label: 'Ascenso por arrastre' },
  { tipo: 'descenso_directo',     label: 'Descenso directo' },
  { tipo: 'descenso_coeficiente', label: 'Descenso por coeficiente' },
  { tipo: 'descenso_arrastre',    label: 'Descenso por arrastre' },
  { tipo: 'filial_bloqueado',     label: 'Filial bloqueado (no puede ascender)' },
]

// Zonas que dependen del resultado final; solo se muestran en las 2 últimas jornadas
export const ARRASTRE_TIPOS = new Set(['descenso_arrastre', 'ascenso_arrastre', 'descenso_coeficiente', 'filial_bloqueado'])

export function ClasificacionTab({ rows, jornadaNum, totalJornadas }: { rows: any[]; jornadaNum: number; totalJornadas: number }) {
  const mostrarArrastre = jornadaNum >= totalJornadas
  const zonaEf = (z: string) => (!mostrarArrastre && ARRASTRE_TIPOS.has(z)) ? '' : z
  const zonasPresentes = new Set(rows.map(r => zonaEf(r.zona)).filter(Boolean))
  const leyenda = ZONA_LEYENDA.filter(z => zonasPresentes.has(z.tipo))
  return (
    <>
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
            <th>Mov</th>
            <th className="hidden md:table-cell">ELO</th>
            <th className="hidden md:table-cell">Pts Fantasy</th>
            <th className="hidden md:table-cell">Forma</th>
            <th className="hidden md:table-cell">Racha</th>
            <th>P0</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.codequipo} className="border-b border-pitch-700/50 last:border-0" style={ZONA_BG[zonaEf(row.zona)]}>
              <td className="text-chalk-600 font-mono text-xs">{row.pos}</td>
              <td className="font-medium text-white">
                <span className="flex items-center gap-2">
                  {escudoUrl(row.escudo) && (
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-white rounded-sm flex-shrink-0 p-0.5">
                      <img src={escudoUrl(row.escudo)!} alt="" className="w-full h-full object-contain" />
                    </span>
                  )}
                  {row.nombre_equipo}
                </span>
              </td>
              <td className="text-center text-chalk-600">{row.pj}</td>
              <td className="text-center">{row.pg}</td>
              <td className="text-center text-chalk-600">{row.pe}</td>
              <td className="text-center text-chalk-600">{row.pp}</td>
              <td className="text-center text-chalk-600">{row.gf}</td>
              <td className="text-center text-chalk-600">{row.gc}</td>
              <td className="text-center text-chalk-600">{row.dg > 0 ? `+${row.dg}` : row.dg}</td>
              <td className="text-center font-bold text-white">{row.pts}</td>
              <td className={`text-center text-xs font-medium ${
                row.mov?.startsWith('↑') ? 'text-grass-400'
                : row.mov?.startsWith('↓') ? 'text-red-400'
                : 'text-chalk-600'
              }`}>{row.mov}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell text-xs">{Math.round(row.elo)}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell text-xs">{row.pts_fantasy ? Math.round(row.pts_fantasy) : ''}</td>
              <td className="text-center hidden md:table-cell whitespace-nowrap text-xs">{row.forma}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell text-xs">{row.racha}</td>
              <td className="text-center text-chalk-600">{row.p0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {leyenda.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {leyenda.map(z => (
          <span key={z.tipo} className="flex items-center gap-1.5 text-xs text-chalk-600">
            <span className="inline-block w-3 h-3 rounded-sm" style={ZONA_BG[z.tipo]} />
            {z.label}
          </span>
        ))}
      </div>
    )}
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>PJ</strong> Partidos jugados · <strong>PG</strong> Ganados · <strong>PE</strong> Empatados · <strong>PP</strong> Perdidos · <strong>GF</strong> Goles a favor · <strong>GC</strong> Goles en contra · <strong>DG</strong> Diferencia de goles · <strong>Pts</strong> Puntos · <strong>Mov</strong> Movimiento · <strong>ELO</strong> Rating ELO · <strong>Pts Fantasy</strong> Puntos fantasy acumulados por el equipo · <strong>Forma</strong> Últimos 5 resultados · <strong>Racha</strong> Racha actual · <strong>P0</strong> Porterías a cero
    </p>
    </>
  )
}

export function ResultadosTab({ resultados, jornada }: { resultados: any[]; jornada: number }) {
  return (
    <div>
      <h3 className="text-chalk-600 text-sm mb-4">Jornada {jornada}</h3>
      <div className="space-y-2">
        {resultados.map(r => (
          <div key={r.codacta} className="bg-pitch-800 rounded-xl border border-pitch-700 px-4 py-3 flex items-center gap-4">
            <div className="flex-1 flex items-center justify-end gap-2 text-sm">
              <span className="text-white font-medium text-right">{r.nombre_local}</span>
              {escudoUrl(r.escudo_local) && (
                <span className="inline-flex items-center justify-center w-9 h-9 bg-white rounded-sm flex-shrink-0 p-0.5">
                  <img src={escudoUrl(r.escudo_local)!} alt="" className="w-full h-full object-contain" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 min-w-[80px] justify-center">
              <span className="font-display text-2xl font-bold text-white">{r.goles_local}</span>
              <span className="text-chalk-600">–</span>
              <span className="font-display text-2xl font-bold text-white">{r.goles_visitante}</span>
            </div>
            <div className="flex-1 flex items-center gap-2 text-sm">
              {escudoUrl(r.escudo_visitante) && (
                <span className="inline-flex items-center justify-center w-9 h-9 bg-white rounded-sm flex-shrink-0 p-0.5">
                  <img src={escudoUrl(r.escudo_visitante)!} alt="" className="w-full h-full object-contain" />
                </span>
              )}
              <span className="text-white font-medium">{r.nombre_visitante}</span>
            </div>
          </div>
        ))}
        {resultados.length === 0 && (
          <p className="text-chalk-600 text-sm text-center py-8">No hay resultados para esta jornada</p>
        )}
      </div>
    </div>
  )
}

export function JugadoresTab({ jugadores, tipo }: { jugadores: any[]; tipo: string }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left w-12">Pos</th>
            <th className="text-left">Jugador</th>
            <th className="text-left w-10"></th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            {tipo === 'goleadores' ? (
              <>
                <th className="text-grass-400">Goles</th>
                <th>PJ</th>
                <th className="hidden md:table-cell">Partidos con gol</th>
                <th className="hidden md:table-cell">Goles/PJ</th>
                <th className="hidden md:table-cell">Min/Gol</th>
                <th className="hidden md:table-cell">Pts Fantasy</th>
                <th className="hidden md:table-cell">ELO</th>
              </>
            ) : (
              <>
                <th>PJ</th>
                <th className="text-grass-400">Pts Fantasy</th>
                <th className="hidden md:table-cell">Media</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {jugadores.map(j => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{j.rank}</td>
              <td className="text-chalk-600 font-mono text-xs">{j.posicion || '—'}</td>
              <td className="font-medium text-white">{formatNombre(j.nombre)}</td>
              <EscudoCell escudo={j.escudo} />
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              {tipo === 'goleadores' ? (
                <>
                  <td className="text-center font-bold text-white">{j.goles}</td>
                  <td className="text-center text-chalk-600">{j.pj}</td>
                  <td className="text-center text-chalk-600 hidden md:table-cell">{j.partidos_con_gol ?? '—'}</td>
                  <td className="text-center text-chalk-600 hidden md:table-cell">{j.goles_pj?.toFixed(2)}</td>
                  <td className="text-center text-chalk-600 hidden md:table-cell">{j.min_gol != null ? j.min_gol : '—'}</td>
                  <td className="text-center text-chalk-600 hidden md:table-cell">{j.pts_fantasy}</td>
                  <td className="text-center text-chalk-600 hidden md:table-cell">{j.elo != null ? j.elo : '—'}</td>
                </>
              ) : (
                <>
                  <td className="text-center text-chalk-600">{j.pj}</td>
                  <td className="text-center font-bold text-white">{j.pts_fantasy}</td>
                  <td className="text-center text-chalk-600 hidden md:table-cell">{j.media_fantasy?.toFixed(1)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {tipo === 'goleadores' ? (
      <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
        <strong>Pos</strong> Demarcación del jugador (POR · DEF · MED · DEL) · <strong>PJ</strong> Partidos jugados · <strong>Goles</strong> Goles marcados · <strong>Partidos con gol</strong> Partidos en los que marcó al menos un gol · <strong>Goles/PJ</strong> Goles marcados por partido jugado · <strong>Min/Gol</strong> Minutos jugados por gol marcado · <strong>Pts Fantasy</strong> Puntos acumulados en el sistema fantasy · <strong>ELO</strong> Rating de rendimiento del jugador
      </p>
    ) : (
      <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
        <strong>Pos</strong> Demarcación del jugador (POR · DEF · MED · DEL) · <strong>PJ</strong> Partidos jugados · <strong>Pts Fantasy</strong> Puntos acumulados en el sistema fantasy · <strong>Media</strong> Puntos por partido
      </p>
    )}
    </>
  )
}

export function EloTemporadaTab({ jugadores }: { jugadores: any[] }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left w-12">Pos</th>
            <th className="text-left">Jugador</th>
            <th className="text-left w-10"></th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            <th className="text-grass-400">ELO</th>
            <th>PJ</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map(j => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{j.rank}</td>
              <td className="text-chalk-600 font-mono text-xs">{j.posicion || '—'}</td>
              <td className="font-medium text-white">{formatNombre(j.nombre)}</td>
              <EscudoCell escudo={j.escudo} />
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              <td className="text-center font-bold text-white">{j.elo != null ? Math.round(j.elo) : ''}</td>
              <td className="text-center text-chalk-600">{j.pj}</td>
            </tr>
          ))}
          {jugadores.length === 0 && (
            <tr><td colSpan={7} className="text-chalk-600 text-sm text-center py-8">Sin datos</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>ELO</strong> Rating de rendimiento del jugador · <strong>PJ</strong> Partidos jugados
    </p>
    </>
  )
}

export function PorterosTemporadaTab({ jugadores }: { jugadores: any[] }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left w-12">Pos</th>
            <th className="text-left">Jugador</th>
            <th className="text-left w-10"></th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            <th className="text-grass-400">Goles enc.</th>
            <th>PJ</th>
            <th className="hidden md:table-cell">P0</th>
            <th className="hidden md:table-cell">Goles enc./PJ</th>
            <th className="hidden md:table-cell">P0%</th>
            <th className="hidden md:table-cell">Pts Fantasy</th>
            <th className="hidden md:table-cell">ELO</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map(j => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{j.rank}</td>
              <td className="text-chalk-600 font-mono text-xs">{j.posicion || '—'}</td>
              <td className="font-medium text-white">{formatNombre(j.nombre)}</td>
              <EscudoCell escudo={j.escudo} />
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              <td className="text-center font-bold text-white">{j.goles_enc}</td>
              <td className="text-center text-chalk-600">{j.pj}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell">{j.goles}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell">{j.goles_pj?.toFixed(2)}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell">{j.p0_pct != null ? `${j.p0_pct}%` : ''}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell">{j.pts_fantasy}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell">{j.elo != null ? Math.round(j.elo) : ''}</td>
            </tr>
          ))}
          {jugadores.length === 0 && (
            <tr><td colSpan={12} className="text-chalk-600 text-sm text-center py-8">Sin datos disponibles</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>Pos</strong> Demarcación del jugador (POR · DEF · MED · DEL) · <strong>PJ</strong> Partidos jugados · <strong>P0</strong> Porterías a cero · <strong>P0%</strong> Porcentaje de porterías a cero · <strong>Goles enc.</strong> Goles encajados · <strong>Goles enc./PJ</strong> Goles encajados por partido jugado · <strong>Pts Fantasy</strong> Puntos acumulados en el sistema fantasy · <strong>ELO</strong> Rating ELO del jugador
    </p>
    </>
  )
}

export function TarjetasTemporadaTab({ jugadores }: { jugadores: any[] }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left">Jugador</th>
            <th className="text-left w-10"></th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            <th>Estado</th>
            <th>Amarillas (ciclo)</th>
            <th className="hidden md:table-cell">Amarillas (total)</th>
            <th>Dobles</th>
            <th>Rojas</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map((j, i) => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{i + 1}</td>
              <td className="font-medium text-white">{formatNombre(j.nombre)}</td>
              <EscudoCell escudo={j.escudo} />
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              <td className="text-center whitespace-nowrap">{j.estado === 'SUSPENDIDO' ? '🔴 Suspendido' : '🟡 En ciclo'}</td>
              <td className="text-center font-bold text-white">{j.amarillas_ciclo}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell">{j.amarillas_simples}</td>
              <td className="text-center text-chalk-600">{j.dobles_amarillas}</td>
              <td className="text-center text-chalk-600">{j.rojas_directas}</td>
            </tr>
          ))}
          {jugadores.length === 0 && (
            <tr><td colSpan={9} className="text-chalk-600 text-sm text-center py-8">Sin datos disponibles</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>Estado</strong> 🔴 Suspendido — expulsado, cumple sanción · 🟡 En ciclo — 4 amarillas acumuladas en el ciclo actual · <strong>Amarillas (ciclo)</strong> Amarillas acumuladas en el ciclo actual (se reinicia cada 5) · <strong>Amarillas (total)</strong> Total de amarillas simples en la temporada · <strong>Dobles</strong> Dobles amarillas (expulsión) · <strong>Rojas</strong> Rojas directas
    </p>
    </>
  )
}

export function XiOptimoTemporadaTab({ jugadores }: { jugadores: any[] }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left w-12">Pos</th>
            <th className="text-left">Jugador</th>
            <th className="text-left w-10"></th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            <th className="text-grass-400">Pts Fantasy</th>
            <th>Goles</th>
            <th className="hidden md:table-cell">Racha 5p</th>
            <th className="hidden md:table-cell">Power Ranking</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map(j => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{j.pos_orden}</td>
              <td className="text-chalk-600 font-mono text-xs">{j.posicion || '—'}</td>
              <td className="font-medium text-white">{formatNombre(j.nombre)}</td>
              <EscudoCell escudo={j.escudo} />
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              <td className="text-center font-bold text-white">{j.pts_totales}</td>
              <td className="text-center text-chalk-600">{j.goles}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell">{j.racha_5p}</td>
              <td className="text-center text-chalk-600 hidden md:table-cell">{j.power_ranking}</td>
            </tr>
          ))}
          {jugadores.length === 0 && (
            <tr><td colSpan={9} className="text-chalk-600 text-sm text-center py-8">Sin datos disponibles</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>Pos</strong> Posición en el campo · <strong>Pts Fantasy</strong> Puntos acumulados en el sistema fantasy · <strong>Goles</strong> Goles marcados en la temporada · <strong>Racha 5p</strong> Suma de puntos en las últimas 5 jornadas del equipo · <strong>Power Ranking</strong> Índice combinado de rendimiento (pts, racha, momentum, consistencia)
    </p>
    </>
  )
}

export function GoleadoresJornadaTab({ jugadores }: { jugadores: any[] }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left w-12">Pos</th>
            <th className="text-left">Jugador</th>
            <th className="text-left w-10"></th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            <th className="text-grass-400">Goles</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map(j => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{j.rank}</td>
              <td className="text-chalk-600 font-mono text-xs">{j.posicion || '—'}</td>
              <td className="font-medium text-white">{formatNombre(j.nombre)}</td>
              <EscudoCell escudo={j.escudo} />
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              <td className="text-center font-bold text-white">{j.goles}</td>
            </tr>
          ))}
          {jugadores.length === 0 && (
            <tr><td colSpan={6} className="text-chalk-600 text-sm text-center py-8">Sin goleadores en esta jornada</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>Goles</strong> Goles marcados en la jornada
    </p>
    </>
  )
}

export function EscudoCell({ escudo }: { escudo: string | null }) {
  if (!escudoUrl(escudo)) return <td className="w-10" />
  return (
    <td className="w-10">
      <span className="inline-flex items-center justify-center w-7 h-7 bg-white rounded-sm flex-shrink-0 p-0.5">
        <img src={escudoUrl(escudo)!} alt="" className="w-full h-full object-contain" />
      </span>
    </td>
  )
}

export function TarjetasJornadaTab({ jugadores }: { jugadores: any[] }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left w-12">Pos</th>
            <th className="text-left">Jugador</th>
            <th className="text-left w-10"></th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            <th>🟨</th>
            <th>🟨🟨</th>
            <th>🟥</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map(j => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{j.rank}</td>
              <td className="text-chalk-600 font-mono text-xs">{j.posicion || '—'}</td>
              <td className="font-medium text-white">{formatNombre(j.nombre)}</td>
              <EscudoCell escudo={j.escudo} />
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              <td className="text-center text-chalk-600">{j.goles}</td>
              <td className="text-center text-chalk-600">{j.goles_enc}</td>
              <td className="text-center text-chalk-600">{j.racha_5p}</td>
            </tr>
          ))}
          {jugadores.length === 0 && (
            <tr><td colSpan={8} className="text-chalk-600 text-sm text-center py-8">Sin tarjetas en esta jornada</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>🟨</strong> Tarjeta amarilla · <strong>🟨🟨</strong> Doble amarilla (expulsión) · <strong>🟥</strong> Tarjeta roja directa
    </p>
    </>
  )
}

export function Top5JugadoresTab({ jugadores }: { jugadores: any[] }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left w-12">Pos</th>
            <th className="text-left">Jugador</th>
            <th className="text-left w-10"></th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            <th className="text-grass-400">Pts Fantasy</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map(j => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{j.rank}</td>
              <td className="text-chalk-600 font-mono text-xs">{j.posicion || '—'}</td>
              <td className="font-medium text-white">{formatNombre(j.nombre)}</td>
              <EscudoCell escudo={j.escudo} />
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              <td className="text-center font-bold text-white">{j.pts_fantasy}</td>
            </tr>
          ))}
          {jugadores.length === 0 && (
            <tr><td colSpan={6} className="text-chalk-600 text-sm text-center py-8">Sin datos en esta jornada</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>Pos</strong> Demarcación del jugador (POR · DEF · MED · DEL) · <strong>Pts Fantasy</strong> Puntos acumulados en el sistema fantasy
    </p>
    </>
  )
}

export function Top5EquiposTab({ equipos }: { equipos: any[] }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-8">#</th>
            <th className="text-left w-10"></th>
            <th className="text-left">Equipo</th>
            <th className="text-grass-400">Pts Fantasy</th>
          </tr>
        </thead>
        <tbody>
          {equipos.map(e => (
            <tr key={e.codequipo} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{e.rank}</td>
              <EscudoCell escudo={e.escudo} />
              <td className="font-medium text-white">{e.nombre_equipo}</td>
              <td className="text-center font-bold text-white">{e.pts_fantasy ? Math.round(e.pts_fantasy) : ''}</td>
            </tr>
          ))}
          {equipos.length === 0 && (
            <tr><td colSpan={4} className="text-chalk-600 text-sm text-center py-8">Sin datos en esta jornada</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>Pts Fantasy</strong> Puntos acumulados en el sistema fantasy
    </p>
    </>
  )
}

export function XiOptimoJornadaTab({ jugadores }: { jugadores: any[] }) {
  return (
    <>
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left w-12">Pos</th>
            <th className="text-left">Jugador</th>
            <th className="text-left w-10"></th>
            <th className="text-left hidden md:table-cell">Equipo</th>
            <th className="text-grass-400">Pts Fantasy</th>
            <th>Goles</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map(j => (
            <tr key={`${j.codjugador}-${j.codequipo}`} className="border-b border-pitch-700/50 last:border-0">
              <td className="text-chalk-600 font-mono text-xs">{j.posicion || '—'}</td>
              <td className="font-medium text-white">{formatNombre(j.nombre)}</td>
              <EscudoCell escudo={j.escudo} />
              <td className="text-chalk-600 hidden md:table-cell text-xs">{j.nombre_equipo}</td>
              <td className="text-center font-bold text-white">{j.pts_fantasy}</td>
              <td className="text-center text-chalk-600">{j.goles}</td>
            </tr>
          ))}
          {jugadores.length === 0 && (
            <tr><td colSpan={6} className="text-chalk-600 text-sm text-center py-8">Sin datos en esta jornada</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-chalk-600 leading-relaxed">
      <strong>Pos</strong> Posición en el campo · <strong>Pts Fantasy</strong> Puntos obtenidos en la jornada · <strong>Goles</strong> Goles marcados en la jornada
    </p>
    </>
  )
}
