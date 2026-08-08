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
  marcador: string | null; signo: 'G' | 'E' | 'P' | null; esLocal: boolean | null
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
    return { jornada: c.jornada, fan, pos: c.pos, mov: parseMov(c.mov), rivalNombre, rivalEscudo, marcador, signo, esLocal }
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

export { getResultadosGrupo }
