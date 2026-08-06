// Capa de datos de la ficha de jugador V2 (ruta /v2). Reutiliza columnas y helpers de @/lib/jugador y
// @/lib/equipo; NO importa fetchers privados de la página actual (viven dentro de su page.tsx y no se
// exportan) — se reimplementan aquí para no tocar archivos existentes. Ver DECISIONES-PENDIENTES.md (D1).

import { supabase } from '@/lib/supabase'
import {
  COLS_JUGADOR, COLS_CARRERA, COLS_HITOS, COLS_ACTUACIONES,
  TEMP_LABEL, tempLabel, marcadorLocalVisitante,
  type JugadorFicha, type HitoRow,
} from '@/lib/jugador'
import { getResultadosGrupo, type ChipRacha } from '@/lib/equipo'
import { derivarRol, escalon, cortesValidos, CORTES_FIJOS, type RolPartido } from '@/lib/escala'

export type { JugadorFicha, HitoRow }

// Etiqueta de temporada (2025-26) -> codtemporada TEXT ('21'). Inverso de TEMP_LABEL.
export const COD_FROM_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(TEMP_LABEL).map(([cod, label]) => [label, cod])
)
export function labelToCod(label: string | null | undefined): string | null {
  if (!label) return null
  return COD_FROM_LABEL[label] ?? (TEMP_LABEL[label] ? label : null)
}

// --- Fetchers base ---
export async function getJugadorV2(cod: string): Promise<JugadorFicha | null> {
  const { data } = await supabase.from('web_jugador').select(COLS_JUGADOR).eq('codjugador', cod).limit(1).maybeSingle()
  return (data as unknown as JugadorFicha) || null
}

export type CarreraRow = {
  codtemporada: string; orden_temporada: number | null; codequipo: string
  equipo_nombre: string | null; escudo: string | null; nombre_comp: string | null
  categoria_rama: string | null; categoria_nivel: number | null; codgrupo: string | null
  grupo_nombre: string | null; pj: number | null; goles: number | null; minutos: number | null
  pts_fantasy: number | null; media_fantasy: number | null; elo_final: number | null
  titular: number | null; suplente: number | null; tarjetas_amarillas: number | null
  tarjetas_rojas: number | null; goles_encajados: number | null; porterias_cero: number | null
}
// Carrera ordenada: temporada DESC, y dentro de la temporada orden_temporada ASC (lo decide el pipeline).
export async function getCarreraV2(cod: string): Promise<CarreraRow[]> {
  const { data } = await supabase.from('web_jugador_carrera').select(COLS_CARRERA).eq('codjugador', cod)
  return ((data || []) as any[]).sort((a, b) =>
    String(b.codtemporada).localeCompare(String(a.codtemporada)) || (a.orden_temporada ?? 0) - (b.orden_temporada ?? 0)) as CarreraRow[]
}

export async function getActuacionesV2(cod: string): Promise<any[]> {
  let r = await supabase.from('web_jugador_actuaciones').select(COLS_ACTUACIONES + ', es_local').eq('codjugador', cod).order('rank')
  if (r.error) r = await supabase.from('web_jugador_actuaciones').select(COLS_ACTUACIONES).eq('codjugador', cod).order('rank')
  return (r.data || []) as any[]
}

export async function getHitosV2(cod: string): Promise<HitoRow[]> {
  const { data } = await supabase.from('web_jugador_hitos').select(COLS_HITOS).eq('codjugador', cod)
  return (data || []) as unknown as HitoRow[]
}

// Alerta disciplinaria MÁS RECIENTE del jugador (web_alertas_tarjetas es por jornada). Null si no hay.
export type AlertaRow = {
  estado: string | null; codtemporada: number | null; jornada: number | null
  amarillas_ciclo: number | null; ciclo_umbral: number | null; dobles_amarillas: number | null
  rojas_directas: number | null; nombre_equipo: string | null
}
export async function getAlertaActual(cod: string): Promise<AlertaRow | null> {
  const cols = 'estado, codtemporada, jornada, amarillas_ciclo, ciclo_umbral, dobles_amarillas, rojas_directas, nombre_equipo'
  const { data } = await supabase.from('web_alertas_tarjetas').select(cols)
    .eq('codjugador', cod).order('codtemporada', { ascending: false }).order('jornada', { ascending: false }).limit(1)
  return ((data && data[0]) as AlertaRow) || null
}

// Cortes de percentil (métrica/categoría/temporada). Devuelve la 4-tupla o null si no hay fila.
export async function getPercentilCortes(
  metrica: string, categoria: string | null, codtempInt: number | null
): Promise<[number, number, number, number] | null> {
  if (!categoria || codtempInt == null) return null
  const { data } = await supabase.from('web_percentiles')
    .select('p20, p40, p60, p80').eq('metrica', metrica).eq('categoria', categoria).eq('codtemporada', codtempInt).limit(1).maybeSingle()
  if (!data) return null
  const c = [data.p20, data.p40, data.p60, data.p80]
  if (c.some((x) => x == null)) return null
  return c as [number, number, number, number]
}

// Cortes de ELO por categoría/temporada, validados; si son degenerados o no hay, cae a CORTES_FIJOS.elo.
export async function getCortesElo(categoria: string | null, codtempInt: number | null): Promise<readonly [number, number, number, number]> {
  const p = await getPercentilCortes('elo_jugador', categoria, codtempInt)
  return p && cortesValidos(p) ? p : CORTES_FIJOS.elo
}

// --- Partidos jugados de UNA temporada (todas las competiciones), orden jornada ASC ---
const COLS_PART = 'codacta, codtemporada, codgrupo, jornada, fecha, equipo_nombre, escudo, codequipo, ' +
  'rival_cod, rival_nombre, rival_escudo, resultado, titular, minutos, goles, amarillas, dobles_amarilla, ' +
  'rojas, puntos, elo_delta, goles_encajados, competicion'
export async function getPartidosTemporada(cod: string, codtemp: string): Promise<any[]> {
  const q = (c: string) => supabase.from('web_jugador_partidos').select(c)
    .eq('codjugador', cod).eq('codtemporada', codtemp).order('jornada', { ascending: true })
  let r = await q(COLS_PART + ', es_local')
  if (r.error) r = await q(COLS_PART)
  return (r.data || []) as any[]
}

// --- Ámbito: por competición de la temporada, la secuencia de jornadas con estado (incluidas ausencias) ---
export type JornadaDatum = {
  jornada: number
  estado: { tipo: 'valor'; v: number } | { tipo: 'no_jugo' } | { tipo: 'sin_dato' }
  goles?: number; amarillas?: number; dobles?: number; rojas?: number; gc?: number | null
  titular?: boolean; minutos?: number; rol?: RolPartido
  rivalNombre?: string | null; rivalEscudo?: string | null; resultado?: string | null; esLocal?: boolean | null
}
export type CompAmbito = { codgrupo: string; nombre_comp: string; jornadas: JornadaDatum[] }

// Cruza partidos jugados con las jornadas reales del equipo (web_resultados) para materializar las
// AUSENCIAS: una jornada que el equipo jugó y el jugador no aparece -> {tipo:'no_jugo'}. Sin este cruce,
// una lesión larga sería invisible. Ver DECISIONES-PENDIENTES.md (D3).
export async function getAmbitoTemporada(cod: string, codtemp: string): Promise<CompAmbito[]> {
  const partidos = await getPartidosTemporada(cod, codtemp)
  if (partidos.length === 0) return []

  // Agrupar por codgrupo (una competición).
  const porGrupo = new Map<string, any[]>()
  for (const p of partidos) {
    const g = String(p.codgrupo ?? '')
    if (!porGrupo.has(g)) porGrupo.set(g, [])
    porGrupo.get(g)!.push(p)
  }

  const comps: CompAmbito[] = []
  for (const [codgrupo, ps] of Array.from(porGrupo.entries())) {
    const nombreEquipo: string | null = ps[0]?.equipo_nombre ?? null
    const nombreComp: string = ps[0]?.competicion ?? 'Competición'
    // Jornadas reales del equipo en ese grupo (para las ausencias).
    const teamRows = await getResultadosGrupo(nombreEquipo, codgrupo)
    const jornadasEquipo = new Set<number>(teamRows.filter((r) => r.goles_local != null).map((r) => r.jornada))
    const jugadas = new Map<number, any>()
    for (const p of ps) jugadas.set(p.jornada, p)
    Array.from(jugadas.keys()).forEach((j) => jornadasEquipo.add(j)) // por si el equipo aún no está en web_resultados

    const jornadas: JornadaDatum[] = Array.from(jornadasEquipo).sort((a, b) => a - b).map((jornada) => {
      const p = jugadas.get(jornada)
      if (!p) return { jornada, estado: { tipo: 'no_jugo' } }
      const rol = derivarRol(!!p.titular, p.minutos ?? 0, p.rojas ?? 0, p.dobles_amarilla ?? 0)
      return {
        jornada,
        estado: { tipo: 'valor', v: p.puntos ?? 0 },
        goles: p.goles ?? 0, amarillas: p.amarillas ?? 0, dobles: p.dobles_amarilla ?? 0,
        rojas: p.rojas ?? 0, gc: p.goles_encajados ?? null, titular: !!p.titular, minutos: p.minutos ?? 0, rol,
        rivalNombre: p.rival_nombre ?? null, rivalEscudo: p.rival_escudo ?? null,
        resultado: p.resultado ?? null, esLocal: p.es_local ?? null,
      }
    })
    comps.push({ codgrupo, nombre_comp: nombreComp, jornadas })
  }
  // Liga (más jornadas) primero.
  return comps.sort((a, b) => b.jornadas.length - a.jornadas.length)
}

// --- Forma: ventanas de últimas 5 / 10 / temporada sobre los partidos JUGADOS de la temporada ---
export type Ventana = { label: string; media: number | null; pj: number; delta: number | null }
export function ventanasForma(partidos: any[]): Ventana[] {
  const jug = partidos.filter((p) => p.puntos != null).sort((a, b) => a.jornada - b.jornada)
  const pts = jug.map((p) => p.puntos as number)
  const media = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null)
  const mTemp = media(pts)
  const win = (n: number) => {
    const s = pts.slice(-n)
    const m = media(s)
    return { media: m, pj: s.length, delta: m != null && mTemp != null ? m - mTemp : null }
  }
  const w5 = win(5), w10 = win(10)
  return [
    { label: 'Últimas 5', ...w5 },
    { label: 'Últimas 10', ...w10 },
    { label: 'Temporada', media: mTemp, pj: pts.length, delta: null },
  ]
}

// --- Racha de 5 chips V/E/D de la temporada (más reciente a la derecha) ---
export function racha5DePartidos(partidos: any[]): ChipRacha[] {
  return partidos
    .filter((p) => p.resultado != null)
    .sort((a, b) => a.jornada - b.jornada)
    .slice(-5)
    .map((p): ChipRacha => {
      const { marcador, signo } = marcadorLocalVisitante(p.resultado, p.es_local)
      return { signo: signo as 'G' | 'E' | 'P', jornada: p.jornada ?? null, marcador, rival: p.rival_nombre ?? null }
    })
    .filter((c) => c.signo === 'G' || c.signo === 'E' || c.signo === 'P')
}

// --- Casa / Fuera de la temporada: PJ, goles, media de puntos ---
export type SplitLocal = { pj: number; goles: number; media: number | null }
export function splitCasaFuera(partidos: any[]): { casa: SplitLocal; fuera: SplitLocal; hayLocal: boolean } {
  const agg = (rows: any[]): SplitLocal => {
    const pts = rows.map((r) => r.puntos).filter((x) => x != null) as number[]
    return { pj: rows.length, goles: rows.reduce((s, r) => s + (r.goles ?? 0), 0), media: pts.length ? pts.reduce((s, x) => s + x, 0) / pts.length : null }
  }
  const conLocal = partidos.filter((p) => p.es_local != null)
  return {
    casa: agg(partidos.filter((p) => p.es_local === true)),
    fuera: agg(partidos.filter((p) => p.es_local === false)),
    hayLocal: conLocal.length > 0,
  }
}

// --- Balance del equipo CON él y SIN él (V/E/D). Cruza resultados del equipo con las jornadas jugadas.
// Umbral de publicación: 8 partidos por lado; por debajo -> muestra insuficiente. NUNCA "impacto".
export type Balance = { pg: number; pe: number; pp: number; pj: number }
export async function balanceEquipo(partidos: any[]): Promise<{ con: Balance; sin: Balance; suficiente: boolean }> {
  const zero = (): Balance => ({ pg: 0, pe: 0, pp: 0, pj: 0 })
  const con = zero(), sin = zero()
  // Un grupo/nombre por competición (misma temporada). Cruce por codgrupo.
  const grupos = new Map<string, { nombre: string | null }>()
  const jugadasPorGrupo = new Map<string, Set<number>>()
  for (const p of partidos) {
    const g = String(p.codgrupo ?? '')
    if (!grupos.has(g)) grupos.set(g, { nombre: p.equipo_nombre ?? null })
    if (!jugadasPorGrupo.has(g)) jugadasPorGrupo.set(g, new Set())
    jugadasPorGrupo.get(g)!.add(p.jornada)
  }
  for (const [g, { nombre }] of Array.from(grupos.entries())) {
    if (!nombre) continue
    const rows = await getResultadosGrupo(nombre, g)
    const jugadas = jugadasPorGrupo.get(g)!
    for (const r of rows) {
      if (r.goles_local == null || r.goles_visitante == null) continue
      const local = r.nombre_local === nombre
      const gf = (local ? r.goles_local : r.goles_visitante) as number
      const gc = (local ? r.goles_visitante : r.goles_local) as number
      const bucket = jugadas.has(r.jornada) ? con : sin
      bucket.pj++
      if (gf > gc) bucket.pg++
      else if (gf < gc) bucket.pp++
      else bucket.pe++
    }
  }
  return { con, sin, suficiente: con.pj >= 8 && sin.pj >= 8 }
}

// --- Últimos 3 partidos jugados de la temporada (más reciente primero) ---
export function ultimosDePartidos(partidos: any[], n = 3): any[] {
  return [...partidos].filter((p) => p.puntos != null).sort((a, b) => b.jornada - a.jornada).slice(0, n)
}

// Color de rendimiento por escala. Devuelve la clase de PALETA_TEXTO para un valor y sus cortes.
export function nivelDe(valor: number | null, cortes: readonly [number, number, number, number]): 0 | 1 | 2 | 3 | 4 | null {
  if (valor == null) return null
  return escalon(valor, cortes)
}

export { tempLabel }
