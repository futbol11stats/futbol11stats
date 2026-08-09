// Capa de datos de la FICHA DE COMPETICIÓN v2 (rutas paralelas con sufijo /v2). No toca las rutas
// actuales ni sus componentes. Reutiliza el sistema de color de equipo v2 y las tablas del pipeline.

import { supabase } from '@/lib/supabase'
import { COLS_CLASIFICACION, COLS_TOP_JUGADORES, COLS_EQUIPOS_FORMA, COLS_XI_OPTIMO } from '@/lib/columns'
import { CORTES_FIJOS } from '@/lib/escala'
import { type Ronda } from '@/lib/competiciones'

// Color de la MEDIA de puntos fantasy de un jugador (por partido), con los cortes fijos de la escala
// (mediaPartido) — misma semántica que la ficha de jugador. Sin ámbar como escalón.
const PAL_JUG = ['#f87171', '#94a3b8', '#22a050', '#2ee56b', '#8cf0a2']
function escFijo(v: number, c: readonly number[]) {
  if (v < c[0]) return 0
  for (let i = c.length - 1; i >= 0; i--) if (v > c[i]) return i + 1
  return 1
}
export const colorMediaJug = (v: number | null | undefined) => (v == null ? '' : PAL_JUG[escFijo(v, CORTES_FIJOS.mediaPartido)])

export const TEMPORADA_MAP: Record<string, number> = {
  '2021-22': 17, '2022-23': 18, '2023-24': 19, '2024-25': 20, '2025-26': 21,
}
export const COD_TO_LABEL: Record<number, string> = Object.fromEntries(
  Object.entries(TEMPORADA_MAP).map(([label, cod]) => [cod, label]),
)
export const CATEGORIA_MAP: Record<string, string> = { aficionados: 'AFICIONADO', juveniles: 'JUVENIL' }
export const TEMPORADAS_ORD = [21, 20, 19, 18, 17]

// --- Resolución del grupo (misma lógica que la ruta actual: prefiere la fila de FAMILIA fam-*) ---
export async function getGrupoV2(categoria: string, slugComp: string, slugGrupo: string, codtemporada: number) {
  let query = supabase.from('web_grupos').select('*')
    .eq('slug_comp', slugComp).eq('slug_grupo', slugGrupo).eq('codtemporada', codtemporada)
  const cat = CATEGORIA_MAP[categoria]
  if (cat) query = query.eq('categoria', cat)
  const { data } = await query
  if (!data || !data.length) return null
  return (data as any[]).find((g) => String(g.codgrupo).startsWith('fam-')) ?? data[0]
}

// Mismo grupo en otras temporadas (por slug). Devuelve, por codtemporada, el segmento [jornada] destino.
export async function getVariantesV2(categoria: string, slugComp: string, slugGrupo: string) {
  let query = supabase.from('web_grupos')
    .select('codgrupo, codtemporada, slug_comp, slug_grupo, jornada_actual, rondas')
    .eq('slug_comp', slugComp).eq('slug_grupo', slugGrupo)
  const cat = CATEGORIA_MAP[categoria]
  if (cat) query = query.eq('categoria', cat)
  const { data } = await query
  const map: Record<number, { slug_comp: string; slug_grupo: string; seg: string }> = {}
  for (const g of (data || []) as any[]) {
    const esFamilia = String(g.codgrupo).startsWith('fam-')
    if (map[g.codtemporada] && !esFamilia) continue
    const rondas: Ronda[] = Array.isArray(g.rondas) ? g.rondas : []
    const dflt = rondas.find((r) => r.idx === g.jornada_actual) || rondas[rondas.length - 1]
    map[g.codtemporada] = { slug_comp: g.slug_comp, slug_grupo: g.slug_grupo, seg: dflt ? dflt.slug : `jornada-${g.jornada_actual}` }
  }
  return map
}

// Grupos hermanos de la misma competición (solo liga), ordenados por número de grupo.
export async function getGruposHermanos(nombreComp: string, codtemporada: number) {
  const { data } = await supabase.from('web_grupos')
    .select('slug_grupo, nombre_grupo, slug_comp, codgrupo')
    .eq('nombre_comp', nombreComp).eq('codtemporada', codtemporada)
  return (data || []).sort((a, b) =>
    (parseInt(a.nombre_grupo?.replace(/\D/g, '') || '0') || 0) - (parseInt(b.nombre_grupo?.replace(/\D/g, '') || '0') || 0))
}

// --- Clasificación de una jornada (web_clasificacion, ordenada por posición) ---
export type ClasifCompRow = {
  pos: number; codequipo: string; nombre_equipo: string; escudo: string | null
  pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; dg: number; pts: number
  mov: string | null; elo: number | null; pts_fantasy: number | null
  forma: string | null; racha: string | null; zona: string | null; p0: number | null
}
export async function getClasifV2(codgrupo: string, codtemporada: number, jornada: number): Promise<ClasifCompRow[]> {
  const { data } = await supabase.from('web_clasificacion').select(COLS_CLASIFICACION)
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornada).order('pos')
  return (data || []) as unknown as ClasifCompRow[]
}

// KPIs de la cabecera a partir de la clasificación de la jornada: nº equipos, partidos disputados,
// goles totales, goles/PJ y ELO medio. (Partidos = suma de PJ / 2; goles = suma de GF.)
export type KpisComp = { equipos: number; partidos: number; goles: number; golesPj: number | null; eloMedio: number | null }
export function kpisDeClasif(rows: ClasifCompRow[]): KpisComp {
  const equipos = rows.length
  const sumPj = rows.reduce((s, r) => s + (r.pj || 0), 0)
  const partidos = Math.round(sumPj / 2)
  const goles = rows.reduce((s, r) => s + (r.gf || 0), 0)
  const elos = rows.map((r) => r.elo).filter((e): e is number => e != null)
  return {
    equipos,
    partidos,
    goles,
    golesPj: partidos ? goles / partidos : null,
    eloMedio: elos.length ? Math.round(elos.reduce((s, e) => s + e, 0) / elos.length) : null,
  }
}

// Colores de zona (asc/playoff/descenso) desde web_clasificacion.zona — NO se cablean posiciones.
export const ZONA_COL: Record<string, string> = {
  ascenso: 'var(--e3)', playoff: 'var(--zona-po)', descenso: 'var(--e0)',
}
export const zonaColor = (zona: string | null): string => (zona ? ZONA_COL[zona] ?? 'transparent' : 'transparent')
// Chips de racha G/E/P (mismo criterio que jugador/equipo).
export const RACHA_COL: Record<string, string> = { G: 'var(--e3)', E: 'var(--ink-3)', P: 'var(--e0)' }

// --- Time-machine (foto por jornada -> foto-final -> jornada más cercana), como la ruta actual. ---
async function fetchSnapshot(build: (q: any) => any, jornada: number) {
  const exact = await build(supabase).eq('jornada', jornada)
  if (exact.data && exact.data.length > 0) return exact.data
  const foto = await build(supabase).is('jornada', null)
  if (foto.data && foto.data.length > 0) return foto.data
  const todos = await build(supabase).not('jornada', 'is', null)
  const rows = (todos.data || []) as any[]
  if (rows.length === 0) return []
  const jornadas = Array.from(new Set(rows.map((r) => Number(r.jornada))))
  const objetivo = jornadas.reduce((mejor, j) => {
    const d = Math.abs(j - jornada), dm = Math.abs(mejor - jornada)
    return d < dm || (d === dm && j < mejor) ? j : mejor
  }, jornadas[0])
  return rows.filter((r) => Number(r.jornada) === objetivo)
}

// Destacados de UNA jornada (web_top_jugadores por tipo): mvp_jornada, goleadores_jornada, xi_jornada…
export async function getDestacadosV2(codgrupo: string, codtemporada: number, jornada: number, tipo: string) {
  const { data } = await supabase.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornada).eq('tipo', tipo).order('rank')
  return (data || []) as any[]
}

// Equipos en forma de UNA jornada (web_equipos_forma).
export async function getEquiposFormaV2(codgrupo: string, codtemporada: number, jornada: number) {
  const { data } = await supabase.from('web_equipos_forma').select(COLS_EQUIPOS_FORMA)
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornada).order('rank')
  return (data || []) as any[]
}

// Rankings de TEMPORADA (acumulado hasta la jornada): goleadores/porteros/fantasy rebobinan (snapshot);
// elo_temp es foto-final (no rebobina), como en la ruta actual.
export async function getTopTemporadaV2(codgrupo: string, codtemporada: number, jornada: number) {
  const [snap, elo] = await Promise.all([
    fetchSnapshot((q: any) => q.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada)
      .in('tipo', ['goleadores_temp', 'fantasy_temp', 'porteros_temp']).order('rank'), jornada),
    supabase.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('tipo', 'elo_temp').is('jornada', null).order('rank'),
  ])
  const all = [...snap, ...((elo.data || []) as any[])]
  return {
    goleadores: all.filter((j) => j.tipo === 'goleadores_temp'),
    porteros: all.filter((j) => j.tipo === 'porteros_temp'),
    fantasy: all.filter((j) => j.tipo === 'fantasy_temp'),
    elo: all.filter((j) => j.tipo === 'elo_temp'),
  }
}

// XI Óptimo de temporada (web_xi_optimo tipo temporada, acumulado por jornada).
export async function getXiTemporadaV2(codgrupo: string, codtemporada: number, jornada: number) {
  return fetchSnapshot((q: any) => q.from('web_xi_optimo').select(COLS_XI_OPTIMO)
    .eq('tipo', 'temporada').eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).order('pos_orden'), jornada) as Promise<any[]>
}

// XI Óptimo de UNA jornada: en copa vive en web_xi_optimo (tipo jornada); en liga, en web_top_jugadores (xi_jornada).
export async function getXiJornadaV2(codgrupo: string, codtemporada: number, jornada: number, isCopa: boolean) {
  if (isCopa) {
    const { data } = await supabase.from('web_xi_optimo').select(COLS_XI_OPTIMO)
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('tipo', 'jornada').eq('jornada', jornada).order('pos_orden')
    return (data || []) as any[]
  }
  return getDestacadosV2(codgrupo, codtemporada, jornada, 'xi_jornada')
}
