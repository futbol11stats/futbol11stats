// Capa de datos de la FICHA DE EQUIPO v2. Reutiliza helpers de equipo.ts (resultados por grupo,
// copas, temporadas) y replica el sistema de la ficha de jugador v2. Ruta paralela: no toca la ficha
// de equipo actual ni sus componentes.

import { supabase } from '@/lib/supabase'
import { getResultadosGrupo, type ResultadoRow, type EquipoFicha, COLS_EQUIPO } from '@/lib/equipo'
import { cortesValidos } from '@/lib/escala'

// Paleta de la escala (hex, como en Jornadas de jugador — el runtime de Vercel no purga literales).
const PAL = ['#f87171', '#94a3b8', '#22a050', '#2ee56b', '#8cf0a2']

// Cortes de EQUIPO. web_percentiles NO tiene métricas de equipo (solo jugador), así que aquí van fijos
// (calibrados sobre Preferente, como en la maqueta). Provisionales hasta que el pipeline publique
// percentiles por categoría de equipo — ver DECISIONES-PENDIENTES.md (E-perc).
export const CORTES_EQUIPO = {
  fanJornada: [38, 48, 58, 68] as const,   // puntos fantasy de equipo en UNA jornada
  mediaFan: [42, 50, 57, 65] as const,      // media de fantasy por jornada
  elo: [1020, 1090, 1150, 1210] as const,
}
function esc(v: number, c: readonly [number, number, number, number]) {
  if (v < c[0]) return 0
  for (let i = c.length - 1; i >= 0; i--) if (v > c[i]) return i + 1
  return 1
}
export const colorFan = (v: number | null) => (v == null ? '' : PAL[esc(v, CORTES_EQUIPO.fanJornada)])
export const colorMedia = (v: number | null) => (v == null ? '' : PAL[esc(v, CORTES_EQUIPO.mediaFan)])
export const colorElo = (v: number | null) => (v == null ? '' : PAL[esc(v, CORTES_EQUIPO.elo)])

// Cortes de EQUIPO validados (por si algún día llegan de web_percentiles): caen a los fijos si son
// degenerados. De momento devuelve siempre los fijos.
export function cortesEquipoValidados(c: readonly [number, number, number, number] | null, fijos: readonly [number, number, number, number]) {
  return c && cortesValidos(c as [number, number, number, number]) ? c : fijos
}

export async function getEquipoV2(cod: string): Promise<EquipoFicha | null> {
  const { data } = await supabase.from('web_equipo').select(COLS_EQUIPO).eq('codequipo', cod).limit(1).maybeSingle()
  return (data as unknown as EquipoFicha) || null
}

export async function getTemporadasEquipo(cod: string) {
  const cols = 'codtemporada, nombre_comp, categoria_nivel, rama, codgrupo, grupo_nombre, pj, pts, posicion_final, gf, gc, badge'
  const { data } = await supabase.from('web_equipo_temporadas').select(cols).eq('codequipo', cod)
  return ((data || []) as any[]).sort((a, b) => String(b.codtemporada).localeCompare(String(a.codtemporada)))
}

// --- Serie de clasificación: una fila por jornada del equipo en su grupo de liga ---
// pts_fantasy es ACUMULADO en web_clasificacion; el fantasy de UNA jornada = diferencia con la anterior.
export type ClasifRow = {
  jornada: number; pos: number | null; pts: number | null; pts_fantasy: number | null
  mov: string | null; elo: number | null; pj: number | null
  gf: number | null; gc: number | null; pg: number | null; pe: number | null; pp: number | null
}
const COLS_CLASIF = 'jornada, pos, pts, pts_fantasy, mov, elo, pj, gf, gc, pg, pe, pp'

export async function getSerieLiga(codequipo: string, codgrupo: string | null): Promise<ClasifRow[]> {
  if (!codgrupo) return []
  const { data } = await supabase.from('web_clasificacion').select(COLS_CLASIF)
    .eq('codgrupo', String(codgrupo)).eq('codequipo', String(codequipo)).order('jornada', { ascending: true })
  return (data || []) as ClasifRow[]
}

// --- Datum de una jornada para el gráfico (barra=fantasy de esa jornada; carriles marcador·pos/mov·rival) ---
export type MovDir = { dir: -1 | 0 | 1; n: number } | null
export function parseMov(mov: string | null): MovDir {
  if (!mov) return null
  if (mov.includes('↑')) return { dir: 1, n: parseInt(mov.replace(/\D/g, ''), 10) || 0 }
  if (mov.includes('↓')) return { dir: -1, n: parseInt(mov.replace(/\D/g, ''), 10) || 0 }
  return { dir: 0, n: 0 }
}
export type JornadaEquipoDatum = {
  jornada: number
  fan: number | null            // puntos fantasy de ESA jornada (diff del acumulado)
  pos: number | null; mov: MovDir
  rivalNombre: string | null; rivalEscudo: string | null
  marcador: string | null; signo: 'G' | 'E' | 'P' | null; esLocal: boolean | null; fecha: string | null
}

// Cruza la serie de clasificación (fantasy/pos/mov) con los resultados del grupo (marcador/rival/localía).
export function buildJornadasEquipo(serie: ClasifRow[], resultados: ResultadoRow[], nombre: string): JornadaEquipoDatum[] {
  const resPorJornada = new Map<number, ResultadoRow>()
  for (const r of resultados) if (r.goles_local != null && r.goles_visitante != null) resPorJornada.set(r.jornada, r)
  return serie.map((c, i) => {
    const prev = i > 0 ? (serie[i - 1].pts_fantasy ?? 0) : 0
    const fan = c.pts_fantasy != null ? Math.max(0, c.pts_fantasy - prev) : null
    const r = resPorJornada.get(c.jornada)
    let rivalNombre: string | null = null, rivalEscudo: string | null = null
    let marcador: string | null = null, signo: 'G' | 'E' | 'P' | null = null, esLocal: boolean | null = null
    if (r) {
      const local = r.nombre_local === nombre
      esLocal = local
      const gf = (local ? r.goles_local : r.goles_visitante) as number
      const gc = (local ? r.goles_visitante : r.goles_local) as number
      signo = gf > gc ? 'G' : gf < gc ? 'P' : 'E'
      marcador = `${r.goles_local}-${r.goles_visitante}`  // absoluto local-visitante
      rivalNombre = (local ? r.nombre_visitante : r.nombre_local) as string
    }
    return { jornada: c.jornada, fan, pos: c.pos, mov: parseMov(c.mov), rivalNombre, rivalEscudo, marcador, signo, esLocal, fecha: r?.fecha ?? null }
  })
}

// Escudos de rival por nombre (web_resultados no trae codequipo -> se cruza por nombre con web_equipo).
export async function escudosPorNombre(nombres: string[]): Promise<Map<string, string | null>> {
  const uniq = Array.from(new Set(nombres.filter(Boolean)))
  if (!uniq.length) return new Map()
  const { data } = await supabase.from('web_equipo').select('nombre, escudo').in('nombre', uniq)
  return new Map(((data || []) as any[]).map((e) => [e.nombre as string, (e.escudo as string) ?? null]))
}

// --- Mini clasificación: filas alrededor del equipo (±2), con la última jornada del grupo ---
export type MiniRow = { pos: number; codequipo: string; nombre: string; escudo: string | null; pts: number; me: boolean }
export async function getMiniClasif(codgrupo: string | null, codequipo: string): Promise<{ filas: MiniRow[]; jornada: number | null }> {
  if (!codgrupo) return { filas: [], jornada: null }
  const { data: jr } = await supabase.from('web_clasificacion').select('jornada')
    .eq('codgrupo', String(codgrupo)).order('jornada', { ascending: false }).limit(1)
  const jornada = (jr && jr[0]?.jornada) ?? null
  if (jornada == null) return { filas: [], jornada: null }
  const { data } = await supabase.from('web_clasificacion').select('pos, codequipo, nombre_equipo, escudo, pts')
    .eq('codgrupo', String(codgrupo)).eq('jornada', jornada).order('pos', { ascending: true })
  const rows = (data || []) as any[]
  const idx = rows.findIndex((r) => String(r.codequipo) === String(codequipo))
  if (idx < 0) return { filas: [], jornada }
  const from = Math.max(0, idx - 2), to = Math.min(rows.length, idx + 3)
  const filas: MiniRow[] = rows.slice(from, to).map((r) => ({
    pos: r.pos, codequipo: String(r.codequipo), nombre: r.nombre_equipo, escudo: r.escudo ?? null,
    pts: r.pts, me: String(r.codequipo) === String(codequipo),
  }))
  return { filas, jornada }
}

// --- Análisis: balance V/E/D + casa/fuera + goles, todo desde los resultados del grupo ---
export type LadoEq = { v: number; e: number; d: number; gf: number; gc: number; pj: number }
export function analisisResultados(resultados: ResultadoRow[], nombre: string): { v: number; e: number; d: number; pj: number; casa: LadoEq; fuera: LadoEq } {
  const zero = (): LadoEq => ({ v: 0, e: 0, d: 0, gf: 0, gc: 0, pj: 0 })
  const casa = zero(), fuera = zero()
  let v = 0, e = 0, d = 0
  for (const r of resultados) {
    if (r.goles_local == null || r.goles_visitante == null) continue
    const local = r.nombre_local === nombre
    const gf = (local ? r.goles_local : r.goles_visitante) as number
    const gc = (local ? r.goles_visitante : r.goles_local) as number
    const s = gf > gc ? 'v' : gf < gc ? 'd' : 'e'
    if (s === 'v') v++; else if (s === 'd') d++; else e++
    const b = local ? casa : fuera
    b.pj++; b.gf += gf; b.gc += gc; b[s]++
  }
  return { v, e, d, pj: v + e + d, casa, fuera }
}

// --- Forma del equipo: media de PUNTOS FANTASY por partido en ventanas + racha de 5 ---
// Equivalente de equipo al bloque Forma de jugador (que también son puntos fantasy). Usa el `fan` de cada
// jornada (fantasy de esa jornada) para que hable el mismo idioma que el KPI "Media F." y se coloree con
// los MISMOS cortes (CORTES_EQUIPO.mediaFan). La racha sigue saliendo del signo del resultado.
export type VentanaEq = { label: string; media: number | null; pj: number; delta: number | null }
export function formaEquipo(jornadas: JornadaEquipoDatum[]): { ventanas: VentanaEq[]; racha: Array<{ signo: 'G' | 'E' | 'P'; jornada: number; marcador: string | null }> } {
  const conFan = jornadas.filter((j) => j.fan != null)
  const pts = conFan.map((j) => j.fan as number)
  const jug = jornadas.filter((j) => j.signo != null)
  const media = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)
  const mTemp = media(pts)
  const win = (n: number) => { const s = pts.slice(-n); const m = media(s); return { media: m, pj: s.length, delta: m != null && mTemp != null ? m - mTemp : null } }
  const ventanas: VentanaEq[] = [
    { label: 'Últimas 5', ...win(5) },
    { label: 'Últimas 10', ...win(10) },
    { label: 'Temporada', media: mTemp, pj: pts.length, delta: null },
  ]
  const racha = jug.slice(-5).map((j) => ({ signo: j.signo as 'G' | 'E' | 'P', jornada: j.jornada, marcador: j.marcador }))
  return { ventanas, racha }
}

// --- Goles por tramos (7 tramos, incluido 90+). Filtra por grupo (que es propio de la temporada). ---
export type TramoRow = { tramo: string; gf: number; gc: number }
const TRAMOS_ORDEN = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90', '90+']
export async function getTramos(codequipo: string, codgrupo: string | null): Promise<TramoRow[]> {
  if (!codgrupo) return []
  const { data } = await supabase.from('web_goles_tramos').select('tramo, gf, gc')
    .eq('codequipo', String(codequipo)).eq('codgrupo', String(codgrupo))
  const rows = (data || []) as any[]
  if (!rows.length) return []
  return TRAMOS_ORDEN.map((t) => { const r = rows.find((x) => x.tramo === t); return { tramo: t, gf: r?.gf ?? 0, gc: r?.gc ?? 0 } })
}

// --- Facetas: ranking del equipo DENTRO DE SU GRUPO en gf, gc (menos es mejor), pts_fantasy. ---
export type Facetas = { gf: number | null; gc: number | null; ptsFan: number | null; n: number }
export async function getFacetasGrupo(codgrupo: string | null, codequipo: string): Promise<Facetas> {
  if (!codgrupo) return { gf: null, gc: null, ptsFan: null, n: 0 }
  const { data: jr } = await supabase.from('web_clasificacion').select('jornada')
    .eq('codgrupo', String(codgrupo)).order('jornada', { ascending: false }).limit(1)
  const jornada = (jr && jr[0]?.jornada) ?? null
  if (jornada == null) return { gf: null, gc: null, ptsFan: null, n: 0 }
  const { data } = await supabase.from('web_clasificacion').select('codequipo, gf, gc, pts_fantasy')
    .eq('codgrupo', String(codgrupo)).eq('jornada', jornada)
  const rows = (data || []) as any[]
  const n = rows.length
  const rank = (key: string, desc: boolean) => {
    const me = rows.find((r) => String(r.codequipo) === String(codequipo))
    if (!me || me[key] == null) return null
    const mv = me[key] as number
    return 1 + rows.filter((r) => r[key] != null && (desc ? r[key] > mv : r[key] < mv)).length
  }
  return { gf: rank('gf', true), gc: rank('gc', false), ptsFan: rank('pts_fantasy', true), n }
}

// --- Plantilla de la temporada seleccionada (aficionados): por líneas + top por fantasy ---
export type PlantillaEqRow = {
  codjugador: string; nombre: string; pos: string | null; linea: 'POR' | 'DEF' | 'MED' | 'DEL' | 'OTR'
  portero: boolean; pj: number; goles: number; minutos: number; porteriasCero: number
  ta: number; td: number; tr: number; pts: number | null; elo: number | null
}
const LINEA_DE: Record<string, 'POR' | 'DEF' | 'MED' | 'DEL'> = { POR: 'POR', DEF: 'DEF', MED: 'MED', DEL: 'DEL' }
export async function getPlantillaEquipoV2(codequipo: string, codtemp: string | null): Promise<PlantillaEqRow[]> {
  if (!codtemp) return []
  const { data: car } = await supabase.from('web_jugador_carrera')
    .select('codjugador, pj, goles, minutos, pts_fantasy, elo_final, porterias_cero, tarjetas_amarillas, tarjetas_dobles, tarjetas_rojas')
    .eq('codequipo', String(codequipo)).eq('codtemporada', String(codtemp))
  const rows = (car || []) as any[]
  const ids = Array.from(new Set(rows.map((r) => String(r.codjugador))))
  if (!ids.length) return []
  const { data: jug } = await supabase.from('web_jugador').select('codjugador, nombre, posicion_pastilla, es_portero').in('codjugador', ids)
  const info = new Map<string, any>((jug || []).map((j: any) => [String(j.codjugador), j]))
  return rows.map((r) => {
    const j = info.get(String(r.codjugador))
    const pos = j?.posicion_pastilla ?? null
    return {
      codjugador: String(r.codjugador), nombre: j?.nombre ?? '', pos,
      linea: (pos && LINEA_DE[pos]) || 'OTR', portero: !!j?.es_portero,
      pj: r.pj ?? 0, goles: r.goles ?? 0, minutos: r.minutos ?? 0, porteriasCero: r.porterias_cero ?? 0,
      ta: r.tarjetas_amarillas ?? 0, td: r.tarjetas_dobles ?? 0, tr: r.tarjetas_rojas ?? 0,
      pts: r.pts_fantasy ?? null, elo: r.elo_final ?? null,
    }
  })
}

// --- Movimientos (altas/bajas/promociones) e hitos del club ---
export async function getMovimientosEquipo(cod: string) {
  const cols = 'codtemporada, fecha, clase, direccion, codjugador, nombre, equipo_rel_nombre, equipo_rel_escudo'
  const { data } = await supabase.from('web_equipo_movimientos').select(cols).eq('codequipo', String(cod))
  return ((data || []) as any[]).sort((a, b) => String(b.fecha || b.codtemporada || '').localeCompare(String(a.fecha || a.codtemporada || '')))
}
export async function getHitosEquipo(cod: string) {
  const { data } = await supabase.from('web_equipo_hitos').select('tipo_hito, fecha, codtemporada, detalle, valor').eq('codequipo', String(cod))
  return (data || []) as any[]
}

// Media de fantasy y ELO de cierre POR temporada (para las tarjetas de Temporadas). Una query: todas las
// filas de clasificación del equipo; en JS se toma la de mayor jornada de cada temporada.
export async function getMediasPorTemporada(codequipo: string): Promise<Record<string, { media: number | null; elo: number | null }>> {
  const { data } = await supabase.from('web_clasificacion').select('codtemporada, jornada, pts_fantasy, pj, elo')
    .eq('codequipo', String(codequipo)).order('jornada', { ascending: true })
  const last = new Map<string, any>()
  for (const r of ((data || []) as any[])) last.set(String(r.codtemporada), r)  // la última jornada gana
  const out: Record<string, { media: number | null; elo: number | null }> = {}
  for (const [t, r] of Array.from(last.entries())) {
    out[t] = { media: r.pts_fantasy != null && r.pj ? r.pts_fantasy / r.pj : null, elo: r.elo ?? null }
  }
  return out
}

// --- Copa: tira de rondas (opción A). No hay pts_fantasy por jornada en copa, así que NO se pintan
// barras: solo el/los partido(s) de la ronda, con el patrón de "Últimos partidos". web_equipo.copas
// registra la ronda alcanzada por competición; se sacan sus partidos de web_resultados por su codgrupo. ---
export type RondaDatum = {
  marcador: string; signo: 'G' | 'E' | 'P'; rivalNombre: string | null; rivalEscudo: string | null
  esLocal: boolean; fecha: string | null; ronda: string
}
export type CopaComp = { label: string; titulo: string; competicion: string; rondas: RondaDatum[] }
// Etiqueta corta del chip a partir de campos SEPARADOS (regla general, no recorte de string): tipo de
// competición abreviado + ronda alcanzada. "Final Copa 1ª Autonómica" + "Final" -> "Copa · Final".
function etiquetaCopa(competicion: string, rondaLabel: string | null): string {
  const tipo = /copa/i.test(competicion) ? 'Copa' : (competicion.split(/\s+/)[0] || 'Copa')
  return rondaLabel ? `${tipo} · ${rondaLabel}` : tipo
}
export async function getCopasAmbito(codequipo: string, tempSel: string | null, nombre: string): Promise<CopaComp[]> {
  if (!tempSel) return []
  const { data } = await supabase.from('web_equipo').select('copas').eq('codequipo', String(codequipo)).limit(1).maybeSingle()
  const raw = (data as { copas?: unknown } | null)?.copas
  if (!Array.isArray(raw)) return []
  const delTemp = (raw as any[]).filter((c) => String(c.codtemporada) === String(tempSel) && c.codgrupo)
  const out: CopaComp[] = []
  for (const c of delTemp) {
    const res = await getResultadosGrupo(nombre, String(c.codgrupo))
    const jugados = res.filter((r) => r.goles_local != null && r.goles_visitante != null).sort((a, b) => a.jornada - b.jornada)
    const rondas: RondaDatum[] = jugados.map((r) => {
      const local = r.nombre_local === nombre
      const gf = (local ? r.goles_local : r.goles_visitante) as number
      const gc = (local ? r.goles_visitante : r.goles_local) as number
      return {
        marcador: `${r.goles_local}-${r.goles_visitante}`, signo: gf > gc ? 'G' : gf < gc ? 'P' : 'E',
        rivalNombre: (local ? r.nombre_visitante : r.nombre_local) as string, rivalEscudo: null,
        esLocal: local, fecha: r.fecha, ronda: c.ronda_label || 'Ronda',
      }
    })
    if (rondas.length) out.push({ label: etiquetaCopa(c.competicion, c.ronda_label), titulo: c.competicion, competicion: c.competicion, rondas })
  }
  return out
}

export { getResultadosGrupo }
