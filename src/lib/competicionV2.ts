// Capa de datos de la FICHA DE COMPETICIÓN v2 (rutas paralelas con sufijo /v2). No toca las rutas
// actuales ni sus componentes. Reutiliza el sistema de color de equipo v2 y las tablas del pipeline.

import { supabase } from '@/lib/supabase'
import { COLS_CLASIFICACION } from '@/lib/columns'
import { type Ronda } from '@/lib/competiciones'

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
