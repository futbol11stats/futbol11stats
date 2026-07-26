'use client'

import { useState, Fragment } from 'react'
import { ChevronDown, Loader2, CircleDot } from 'lucide-react'
import { supabase, escudoUrl } from '@/lib/supabase'
import EscudoImg from '@/components/EscudoImg'
import { tempLabel, fechaCorta } from '@/lib/jugador'

// FLAG: la tabla web_jugador_partidos la está creando el pipeline. Con el flag en false la Trayectoria
// se comporta como antes (sin chevron ni acordeón). Poner en true SOLO tras verificar que la tabla
// responde (y ajustar los nombres de columna si difieren de los usados en PartidosLista).
export const PARTIDOS_HABILITADO = true

type Carrera = any

// Columnas reales de web_jugador_partidos (2M+ filas, RLS pública).
const COLS_P = 'codacta, jornada, fecha, rival_nombre, rival_escudo, resultado, titular, minutos, goles, amarillas, dobles_amarilla, rojas, puntos, elo_delta, goles_encajados'

async function fetchPartidos(codjugador: string, codtemporada: string, codequipo: string) {
  const { data, error } = await supabase
    .from('web_jugador_partidos')
    .select(COLS_P)
    .eq('codjugador', codjugador)
    .eq('codtemporada', codtemporada)
    .eq('codequipo', codequipo)
    .order('jornada', { ascending: false })   // por jornada (entero), no por el string de fecha
  if (error) return { error: error.message, rows: [] as any[] }
  return { error: null, rows: (data || []) as any[] }
}

// resultado = "X-Y G/E/P" (ya en perspectiva del jugador): el color sale del sufijo.
function parseResultado(resultado: string | null): { marcador: string; signo: string } {
  const m = (resultado || '').trim().match(/^(.*?)\s*([GEP])$/i)
  return m ? { marcador: m[1].trim(), signo: m[2].toUpperCase() } : { marcador: resultado || '', signo: '' }
}
const colorSigno = (s: string) => (s === 'G' ? 'text-grass-300' : s === 'P' ? 'text-red-300' : 'text-chalk-400')

function PartidosLista({ rows, portero }: { rows: any[]; portero: boolean }) {
  if (rows.length === 0) return <p className="px-3 py-3 text-xs text-chalk-600">Sin partidos registrados.</p>
  return (
    <div className="text-xs">
      {rows.map((p, i) => {
        const { marcador, signo } = parseResultado(p.resultado)
        const goles = p.goles ?? 0, min = p.minutos ?? 0, pts = p.puntos, gc = p.goles_encajados ?? 0
        const ta = p.amarillas ?? 0, da = p.dobles_amarilla ?? 0, tr = p.rojas ?? 0
        const delta = p.elo_delta
        return (
          <div key={p.codacta ?? i} className="flex items-center gap-2 px-3 py-1.5 border-b border-pitch-700/40 last:border-0">
            <span className="w-6 flex-shrink-0 text-chalk-600 tabular-nums">J{p.jornada}</span>
            <span className="hidden sm:block w-16 flex-shrink-0 text-chalk-600 tabular-nums">{fechaCorta(p.fecha)}</span>
            {escudoUrl(p.rival_escudo) ? (
              <span className="inline-flex items-center justify-center w-4 h-4 bg-white rounded-sm flex-shrink-0 p-px">
                <EscudoImg escudo={p.rival_escudo} nombre={p.rival_nombre ?? undefined} />
              </span>
            ) : <span className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1 min-w-0 truncate text-chalk-300 uppercase font-display">{p.rival_nombre}</span>
            <span className="hidden sm:block w-6 flex-shrink-0 text-center text-chalk-600" title={p.titular ? 'Titular' : 'Suplente'}>{p.titular ? 'T' : 'S'}</span>
            <span className={`w-11 flex-shrink-0 text-right tabular-nums font-semibold font-display ${colorSigno(signo)}`}>{marcador}</span>
            {portero ? (
              <span className="w-11 flex-shrink-0 text-right tabular-nums text-chalk-400">{gc}<span className="hidden sm:inline text-chalk-600"> GC</span></span>
            ) : (
              <span className="w-9 flex-shrink-0 flex items-center justify-end gap-0.5 tabular-nums">
                {goles > 0 ? <><CircleDot className="w-3 h-3 text-grass-400" strokeWidth={2.5} /><span className="text-white font-semibold">{goles}</span></> : <span className="hidden sm:inline text-chalk-700">0</span>}
              </span>
            )}
            {/* Tarjetas: puntos de color en móvil */}
            <span className="flex sm:hidden items-center gap-0.5 flex-shrink-0 w-5 justify-end">
              {(ta > 0 || da > 0) && <span className="inline-block w-1.5 h-2.5 rounded-[1px] bg-amber-400" />}
              {tr > 0 && <span className="inline-block w-1.5 h-2.5 rounded-[1px] bg-red-500" />}
            </span>
            {/* Tarjetas: recuentos en desktop */}
            <span className="hidden sm:flex items-center gap-1.5 flex-shrink-0 w-20 justify-end text-[11px] tabular-nums">
              {ta > 0 && <span className="text-amber-300">{ta}TA</span>}
              {da > 0 && <span className="text-amber-300">{da}·2ªA</span>}
              {tr > 0 && <span className="text-red-300">{tr}TR</span>}
            </span>
            <span className="w-8 flex-shrink-0 text-right text-chalk-600 tabular-nums">{min}′</span>
            <span className={`hidden sm:block w-11 flex-shrink-0 text-right tabular-nums ${delta > 0 ? 'text-grass-400' : delta < 0 ? 'text-red-400' : 'text-chalk-600'}`}>
              {delta != null ? `${delta > 0 ? '+' : ''}${Math.round(delta)}` : ''}
            </span>
            <span className="w-8 flex-shrink-0 text-right text-grass-400 font-medium tabular-nums font-display">{pts != null ? Math.round(pts) : ''}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Trayectoria({ carrera, portero, codjugador }: { carrera: Carrera[]; portero: boolean; codjugador: string }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const [cache, setCache] = useState<Record<string, { loading: boolean; rows: any[] }>>({})
  const nCols = portero ? 11 : 10

  const toggle = async (c: any) => {
    if (!PARTIDOS_HABILITADO) return
    const key = `${c.codtemporada}-${c.codequipo}`
    if (abierto === key) { setAbierto(null); return }
    setAbierto(key)
    if (!cache[key]) {
      setCache((m) => ({ ...m, [key]: { loading: true, rows: [] } }))
      const { rows } = await fetchPartidos(codjugador, String(c.codtemporada), String(c.codequipo))
      setCache((m) => ({ ...m, [key]: { loading: false, rows } }))
    }
  }

  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-x-auto">
      <table className="w-full tabla-clasificacion">
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left">Temp.</th>
            <th className="text-left">Equipo</th>
            <th className="text-left hidden sm:table-cell">Comp.</th>
            <th>PJ</th>
            <th className="hidden sm:table-cell">Min</th>
            <th>{portero ? 'P0' : 'G'}</th>
            {portero && <th>GC</th>}
            <th>TA</th>
            <th>TR</th>
            <th className="hidden sm:table-cell">Pts</th>
            <th className="text-grass-400">ELO</th>
          </tr>
        </thead>
        <tbody>
          {carrera.map((c: any, i: number) => {
            const key = `${c.codtemporada}-${c.codequipo}`
            const open = abierto === key
            return (
              <Fragment key={key}>
                <tr
                  onClick={() => toggle(c)}
                  className={`border-b border-pitch-700/50 ${open ? '' : 'last:border-0'} ${PARTIDOS_HABILITADO ? 'cursor-pointer' : ''}`}
                >
                  <td className="text-chalk-400 font-medium tabular-nums whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {PARTIDOS_HABILITADO && <ChevronDown className={`w-3.5 h-3.5 text-chalk-600 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />}
                      {tempLabel(c.codtemporada)}
                    </span>
                  </td>
                  <td className="col-nombre text-white">
                    <span className="flex items-center gap-2 min-w-0">
                      {escudoUrl(c.escudo) && (
                        <span className="escudo-box inline-flex items-center justify-center w-6 h-6 bg-white rounded-sm flex-shrink-0 p-0.5">
                          <EscudoImg escudo={c.escudo} nombre={c.equipo_nombre} />
                        </span>
                      )}
                      <span className="truncate">{c.equipo_nombre}</span>
                    </span>
                  </td>
                  <td className="text-chalk-600 hidden sm:table-cell whitespace-nowrap text-xs">{c.nombre_comp}{c.grupo_nombre ? ` · ${c.grupo_nombre}` : ''}</td>
                  <td className="text-center text-chalk-400 tabular-nums">{c.pj}</td>
                  <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{(c.minutos ?? 0).toLocaleString('es-ES')}</td>
                  <td className="text-center font-bold text-white tabular-nums">{portero ? (c.porterias_cero ?? 0) : c.goles}</td>
                  {portero && <td className="text-center text-chalk-400 tabular-nums">{c.goles_encajados ?? 0}</td>}
                  <td className="text-center text-chalk-600 tabular-nums">{c.tarjetas_amarillas ?? 0}</td>
                  <td className="text-center text-chalk-600 tabular-nums">{c.tarjetas_rojas ?? 0}</td>
                  <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{c.pts_fantasy != null ? Math.round(c.pts_fantasy) : ''}</td>
                  <td className="text-center text-grass-400 font-medium tabular-nums">{c.elo_final != null ? Math.round(c.elo_final) : ''}</td>
                </tr>
                {open && (
                  <tr className="border-b border-pitch-700/50 last:border-0">
                    <td colSpan={nCols} className="p-0">
                      <div className="border-l-2 border-grass-500 bg-pitch-900/40">
                        {cache[key]?.loading
                          ? <p className="flex items-center gap-2 px-3 py-3 text-xs text-chalk-600"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando partidos…</p>
                          : <PartidosLista rows={cache[key]?.rows || []} portero={portero} />}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
          {carrera.length === 0 && (
            <tr><td colSpan={nCols} className="text-center text-chalk-600 py-6 text-sm">Sin trayectoria registrada</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
