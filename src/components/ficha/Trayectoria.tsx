'use client'

import { useState, Fragment } from 'react'
import ScrollRail from '@/components/ficha/v2/ScrollRail'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Balon, Guante } from '@/components/iconos'
import { supabase, escudoUrl } from '@/lib/supabase'
import EscudoImg from '@/components/EscudoImg'
import NombreEquipo from '@/components/NombreEquipo'
import { fmtNum } from '@/lib/formato'
import Sello from '@/components/Sello'
import IndicadorLocal from '@/components/IndicadorLocal'
import { tempLabel, fechaCorta, signoCls, conSigno, marcadorLocalVisitante, colorSigno } from '@/lib/jugador'

export const PARTIDOS_HABILITADO = true

type Carrera = any

// Columnas reales de web_jugador_partidos (2M+ filas, RLS pública). ronda_label: copa -> "Fase de grupos"/"Final".
const COLS_P = 'codacta, jornada, ronda_label, fecha, rival_nombre, rival_escudo, resultado, titular, minutos, goles, amarillas, dobles_amarilla, rojas, puntos, elo_delta, goles_encajados'

// Se filtra por codgrupo (no solo codequipo+temporada): un jugador puede tener liga Y copa con el MISMO equipo
// en la misma temporada -> son dos etapas distintas; sin codgrupo el acordeón mezclaría ambos.
async function fetchPartidos(codjugador: string, codtemporada: string, codequipo: string, codgrupo: string | null) {
  // es_local (local/visitante) llega con el próximo export; se intenta y, si no existe, se reintenta
  // sin ella -> el icono casa/avión brota solo cuando el dato aterrice.
  const q = (c: string) => {
    let b = supabase.from('web_jugador_partidos').select(c)
      .eq('codjugador', codjugador).eq('codtemporada', codtemporada).eq('codequipo', codequipo)
    if (codgrupo) b = b.eq('codgrupo', codgrupo)
    return b   // el orden NO va por jornada (en copa colisiona: final j1 == 1er grupo j1); se ordena por fecha ISO abajo
  }
  let { data, error } = await q(COLS_P + ', es_local')
  if (error) ({ data, error } = await q(COLS_P))
  if (error) return { error: error.message, rows: [] as any[] }
  const isoF = (f: string | null) => (f && /^\d{2}\/\d{2}\/\d{4}$/.test(f) ? f.slice(6, 10) + f.slice(3, 5) + f.slice(0, 2) : '00000000')
  const rows = ((data || []) as any[]).sort((a, b) => isoF(b.fecha).localeCompare(isoF(a.fecha)))   // más reciente primero
  return { error: null, rows }
}

// Un partido = una FILA de la misma tabla (hereda el grid de la madre; cada dato bajo su columna).
// Móvil: el set madre es PJ·G·TA·TR·ELO, así que MIN/PTS/resultado viven compactos en la celda EQUIPO.
const ACENTO = 'border-l-2 border-grass-500/70'
function PartidoFila({ p, portero }: { p: any; portero: boolean }) {
  const { marcador, signo } = marcadorLocalVisitante(p.resultado, p.es_local)
  const goles = p.goles ?? 0, min = p.minutos ?? 0, pts = p.puntos, gc = p.goles_encajados ?? 0
  const ta = p.amarillas ?? 0, da = p.dobles_amarilla ?? 0, tr = p.rojas ?? 0
  const delta = p.elo_delta
  return (
    <tr className="border-b border-pitch-700/40 bg-pitch-900/30">
      {/* TEMP -> Jnn (· fecha en desktop) */}
      <td className={`${ACENTO} text-chalk-600 tabular-nums whitespace-nowrap`}>
        {p.ronda_label ? p.ronda_label : `J${p.jornada}`}<span className="hidden sm:inline"> · {fechaCorta(p.fecha)}</span>
      </td>
      {/* EQUIPO -> escudo rival + nombre (+ resultado·min·pts SOLO en móvil) */}
      <td className="text-chalk-300 max-w-[7rem] sm:max-w-[13rem]">
        <div className="flex items-center gap-1.5 min-w-0">
          <IndicadorLocal esLocal={p.es_local} />
          {escudoUrl(p.rival_escudo)
            ? <span className="inline-flex items-center justify-center w-5 h-5 bg-white rounded-sm flex-shrink-0 p-px"><EscudoImg escudo={p.rival_escudo} nombre={p.rival_nombre ?? undefined} /></span>
            : <span className="w-5 h-5 flex-shrink-0" />}
          <span className="truncate min-w-0 uppercase font-display">{p.rival_nombre}</span>
        </div>
        <div className="sm:hidden flex items-center gap-1.5 pl-7 mt-0.5 text-[length:var(--t-micro)] whitespace-nowrap">
          <span className={`font-semibold ${colorSigno(signo)}`}>{marcador}</span>
          {pts != null && <span className={signoCls(pts)}>{conSigno(pts)}p</span>}
        </div>
      </td>
      {/* COMP -> resultado coloreado (desktop) */}
      <td className={`hidden sm:table-cell text-center font-semibold tabular-nums ${colorSigno(signo)}`}>{marcador}</td>
      {/* PJ -> T / S */}
      <td className="text-center text-chalk-500" title={p.titular ? 'Titular' : 'Suplente'}>{p.titular ? 'T' : 'S'}</td>
      {/* MIN (columna madre también en móvil) */}
      <td className="text-center text-chalk-600 tabular-nums">{min}′</td>
      {/* G (campo) / P0 (portero: guante si portería a cero) */}
      {portero ? (
        <td className="text-center">{gc === 0 ? <Guante className="inline w-3.5 h-3.5" style={{ color: '#38bdf8' }} strokeWidth={2.25} /> : null}</td>
      ) : (
        <td className="text-center tabular-nums">
          {goles > 0
            ? <span className="inline-flex items-center gap-0.5"><Balon className="w-3 h-3 text-grass-400" strokeWidth={2.5} /><span className="text-white font-semibold">{goles}</span></span>
            : <span className="text-chalk-700">0</span>}
        </td>
      )}
      {/* GC (solo portero) */}
      {portero && <td className="text-center tabular-nums">{gc > 0 ? <span className="text-chalk-400">{gc}</span> : <span className="text-chalk-700">0</span>}</td>}
      {/* TA -> amarillas simples (las dobles van en su propia columna 2A) */}
      <td className="text-center tabular-nums">
        <span className="hidden sm:inline text-amber-300/90">{ta > 0 ? ta : ''}</span>
        <span className="sm:hidden inline-flex justify-center">{ta > 0 && <span className="inline-block w-1.5 h-2.5 rounded-[1px] bg-amber-400" />}</span>
      </td>
      {/* 2A -> dobles amarillas */}
      <td className="text-center tabular-nums">
        <span className="hidden sm:inline text-amber-300/70">{da > 0 ? da : ''}</span>
        <span className="sm:hidden inline-flex justify-center">{da > 0 && <span className="inline-block w-1.5 h-2.5 rounded-[1px] bg-amber-400/60" />}</span>
      </td>
      {/* TR -> rojas */}
      <td className="text-center tabular-nums">
        <span className="hidden sm:inline text-red-300/90">{tr > 0 ? tr : ''}</span>
        <span className="sm:hidden inline-flex justify-center">{tr > 0 && <span className="inline-block w-1.5 h-2.5 rounded-[1px] bg-red-500" />}</span>
      </td>
      {/* PTS (desktop) -> con signo y color */}
      <td className={`hidden sm:table-cell text-center font-medium tabular-nums ${signoCls(pts)}`}>{pts != null ? conSigno(pts) : ''}</td>
      {/* ELO -> Δ con signo y color */}
      <td className={`text-center tabular-nums ${signoCls(delta)}`}>{conSigno(delta)}</td>
    </tr>
  )
}

// railWrap: en la ficha v2 (dentro de .fjv2, con ficha.css) envuelve la tabla en ScrollRail (flechas +
// degradado en desktop). En la ficha actual (sin ese CSS) se queda con el contenedor overflow-x-auto de siempre.
export default function Trayectoria({ carrera, portero, codjugador, railWrap = false }: { carrera: Carrera[]; portero: boolean; codjugador: string; railWrap?: boolean }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const [cache, setCache] = useState<Record<string, { loading: boolean; rows: any[] }>>({})
  const nCols = portero ? 12 : 11

  const toggle = async (c: any) => {
    if (!PARTIDOS_HABILITADO) return
    const key = `${c.codtemporada}-${c.codequipo}-${c.codgrupo ?? ''}`
    if (abierto === key) { setAbierto(null); return }
    setAbierto(key)
    if (!cache[key]) {
      setCache((m) => ({ ...m, [key]: { loading: true, rows: [] } }))
      const { rows } = await fetchPartidos(codjugador, String(c.codtemporada), String(c.codequipo), c.codgrupo ?? null)
      setCache((m) => ({ ...m, [key]: { loading: false, rows } }))
    }
  }

  // La tabla es w-full: se ancla al contenedor y las columnas de la derecha (ELO) se comprimen sin desbordar,
  // por eso no había scroll. min-w-max en desktop la deja crecer a su contenido -> desborda -> scroll.
  const tabla = (
      <table className={`w-full ${railWrap ? 'sm:min-w-max' : ''} tabla-clasificacion tabla-partidos`}>
        <thead>
          <tr className="border-b border-pitch-700">
            <th className="text-left">Temp.</th>
            <th className="text-left">Equipo</th>
            <th className="text-left hidden sm:table-cell">Comp.</th>
            <th>PJ</th>
            <th>Min</th>
            <th>{portero ? 'P0' : 'G'}</th>
            {portero && <th>GC</th>}
            <th>TA</th>
            <th>2A</th>
            <th>TR</th>
            <th>PF</th>
            <th className="text-grass-400">ELO</th>
          </tr>
        </thead>
        <tbody>
          {carrera.map((c: any, i: number) => {
            const key = `${c.codtemporada}-${c.codequipo}-${c.codgrupo ?? ''}`
            const open = abierto === key
            const box = cache[key]
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
                  <td className="col-nombre text-white max-w-[8rem] sm:max-w-none">
                    <span className="flex items-center gap-2 min-w-0">
                      {escudoUrl(c.escudo) && (
                        <span className="escudo-box inline-flex items-center justify-center w-6 h-6 bg-white rounded-sm flex-shrink-0 p-0.5">
                          <EscudoImg escudo={c.escudo} nombre={c.equipo_nombre} />
                        </span>
                      )}
                      {/* El nombre navega a la ficha de equipo (en ESA temporada); stopPropagation evita desplegar. */}
                      <span className="truncate" onClick={(e) => e.stopPropagation()}>
                        <NombreEquipo codequipo={c.codequipo} nombre={c.equipo_nombre} temporada={tempLabel(c.codtemporada)} />
                      </span>
                    </span>
                  </td>
                  <td className="text-chalk-600 hidden sm:table-cell whitespace-nowrap text-xs">
                    <span className="inline-flex items-center gap-1.5"><Sello nombreComp={c.nombre_comp} size={20} />{c.nombre_comp}{c.grupo_nombre ? ` · ${c.grupo_nombre}` : ''}</span>
                  </td>
                  <td className="text-center text-chalk-400 tabular-nums">{c.pj}</td>
                  <td className="text-center text-chalk-600 tabular-nums">{(c.minutos ?? 0).toLocaleString('es-ES')}</td>
                  <td className="text-center font-bold text-white tabular-nums">{portero ? (c.porterias_cero ?? 0) : c.goles}</td>
                  {portero && <td className="text-center text-chalk-400 tabular-nums">{c.goles_encajados ?? 0}</td>}
                  <td className="text-center text-chalk-600 tabular-nums">{c.tarjetas_amarillas ?? 0}</td>
                  <td className="text-center text-chalk-600 tabular-nums">{c.tarjetas_dobles ?? 0}</td>
                  <td className="text-center text-chalk-600 tabular-nums">{c.tarjetas_rojas ?? 0}</td>
                  <td className="text-center text-chalk-400 tabular-nums">{c.pts_fantasy != null ? fmtNum(c.pts_fantasy) : ''}</td>
                  <td className="text-center text-grass-400 font-medium tabular-nums">{c.elo_final != null ? fmtNum(c.elo_final) : ''}</td>
                </tr>
                {open && box?.loading && (
                  <tr className="bg-pitch-900/30 border-b border-pitch-700/50">
                    <td colSpan={nCols} className={`${ACENTO}`}>
                      <span className="flex items-center gap-2 px-1 py-1 text-xs text-chalk-600"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando partidos…</span>
                    </td>
                  </tr>
                )}
                {open && box && !box.loading && box.rows.length === 0 && (
                  <tr className="bg-pitch-900/30 border-b border-pitch-700/50">
                    <td colSpan={nCols} className={`${ACENTO} text-xs text-chalk-600 py-2`}>Sin partidos registrados.</td>
                  </tr>
                )}
                {open && box && !box.loading && box.rows.map((p, k) => (
                  <PartidoFila key={p.codacta ?? k} p={p} portero={portero} />
                ))}
              </Fragment>
            )
          })}
          {carrera.length === 0 && (
            <tr><td colSpan={nCols} className="text-center text-chalk-600 py-6 text-sm">Sin trayectoria registrada</td></tr>
          )}
        </tbody>
      </table>
  )
  return railWrap
    ? <ScrollRail wrapClassName="tray-srail" className="tray-srail-sc">{tabla}</ScrollRail>
    : <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-x-auto">{tabla}</div>
}
