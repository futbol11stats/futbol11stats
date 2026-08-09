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

// web_clasificacion.zona trae valores GRANULARES: ascenso_directo, playoff_ascenso, ascenso_arrastre,
// descenso_directo, descenso_coeficiente, descenso_arrastre, filial_bloqueado, "" (media tabla). Se
// agrupan en familias para el color/etiqueta. Playoff = ÁMBAR (regla del sitio, no azul de la maqueta).
export type ZonaFam = 'ascenso' | 'playoff' | 'descenso' | 'filial'
export function zonaFamilia(zona: string | null): ZonaFam | null {
  if (!zona) return null
  if (zona === 'ascenso_directo') return 'ascenso'
  if (zona.startsWith('playoff') || zona === 'ascenso_arrastre') return 'playoff'
  if (zona.startsWith('filial')) return 'filial'
  if (zona.startsWith('descenso')) return 'descenso'
  return null
}
export const ZONA_FAM_COL: Record<ZonaFam, string> = {
  ascenso: 'var(--e3)', playoff: 'var(--amber)', descenso: 'var(--e0)', filial: 'var(--zona-po)',
}
export const ZONA_FAM_LABEL: Record<ZonaFam, string> = {
  ascenso: 'ASCENSO', playoff: 'PLAYOFF', descenso: 'DESCENSO', filial: 'FILIAL',
}
export const zonaColor = (zona: string | null): string => {
  const f = zonaFamilia(zona)
  return f ? ZONA_FAM_COL[f] : 'transparent'
}
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

// --- Resultados de una jornada (web_resultados). campo ya poblado; fecha/hora pueden venir NULL. ---
export type ResultadoCompRow = {
  codacta: string | null
  nombre_local: string; escudo_local: string | null; goles_local: number | null
  nombre_visitante: string; escudo_visitante: string | null; goles_visitante: number | null
  fecha: string | null; hora: string | null; campo: string | null
}
export async function getResultadosV2(codgrupo: string, codtemporada: number, jornada: number): Promise<ResultadoCompRow[]> {
  const { data } = await supabase.from('web_resultados')
    .select('codacta, nombre_local, escudo_local, goles_local, goles_visitante, nombre_visitante, escudo_visitante, fecha, hora, campo')
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornada).order('fecha').order('hora')
  return (data || []) as unknown as ResultadoCompRow[]
}

// nombre_equipo -> codequipo (para enlazar equipos en Resultados; web_resultados no trae codequipo).
export async function getEquiposMapV2(codgrupo: string, codtemporada: number): Promise<Map<string, string>> {
  const { data } = await supabase.from('web_clasificacion').select('codequipo, nombre_equipo')
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', 1)
  const m = new Map<string, string>()
  for (const r of (data || []) as any[]) m.set(r.nombre_equipo, String(r.codequipo))
  return m
}

// --- GLOBAL: grupos de la competición + clasificación de todos para la vista por zonas. ---
export async function getGlobalGruposV2(categoria: string, slugComp: string, codtemporada: number) {
  let q = supabase.from('web_grupos')
    .select('codgrupo, nombre_grupo, slug_grupo, slug_comp, nombre_comp, jornada_actual, total_jornadas, tipo')
    .eq('slug_comp', slugComp).eq('codtemporada', codtemporada)
  const cat = CATEGORIA_MAP[categoria]
  if (cat) q = q.eq('categoria', cat)
  const { data } = await q
  return ((data || []) as any[]).filter((g) => !g.tipo || g.tipo === 'LIGA')
    .sort((a, b) => (parseInt(a.nombre_grupo?.replace(/\D/g, '') || '0') || 0) - (parseInt(b.nombre_grupo?.replace(/\D/g, '') || '0') || 0))
}
// Clasificación de TODOS los grupos a una jornada (para KPIs agregados + vista por zonas). Trae pj/gf/elo
// para reutilizar kpisDeClasif y pos/zona para el bloque por zonas.
export async function getGlobalClasifV2(codgrupos: string[], codtemporada: number, jornada: number) {
  if (!codgrupos.length) return [] as any[]
  const { data } = await supabase.from('web_clasificacion')
    .select('codgrupo, pos, codequipo, nombre_equipo, escudo, pj, gf, pts, elo, zona')
    .in('codgrupo', codgrupos).eq('codtemporada', codtemporada).eq('jornada', jornada).order('pos')
  return (data || []) as any[]
}

// --- Carrera de posiciones: posición por jornada de cada equipo + bandas de zona (de la última jornada). ---
const CARRERA_PAL = ['#d94f4f', '#2f9e6d', '#e0a53f', '#6b8fd6', '#5b6fa8', '#c93f6f', '#9e7a3f', '#7a9e3f', '#3fb0a5', '#8a4fd6', '#3f9ed6', '#a04fd6', '#4fae7a', '#d67a3f', '#6b5fd6', '#8a9ab8', '#5b8fa8', '#b0863f', '#5fae9e', '#c96f9e']
const iniEq = (n: string) => (n || '').replace(/['"]/g, '').split(/\s+/).filter((w) => w.length > 2).slice(0, 1).join('').slice(0, 3).toUpperCase() || (n || '').slice(0, 3).toUpperCase()
export type CarreraSerie = { codequipo: string; nombre: string; ini: string; color: string; pos: number[] }
export type CarreraBand = { from: number; to: number; color: string }
export async function getCarreraV2(codgrupo: string, codtemporada: number): Promise<{ series: CarreraSerie[]; jornadas: number[]; bands: CarreraBand[] }> {
  const { data } = await supabase.from('web_clasificacion').select('jornada, codequipo, nombre_equipo, pos, zona')
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).order('jornada').order('pos')
  const rows = (data || []) as any[]
  if (!rows.length) return { series: [], jornadas: [], bands: [] }
  const jornadas = Array.from(new Set(rows.map((r) => Number(r.jornada)))).sort((a, b) => a - b)
  const maxJ = jornadas[jornadas.length - 1]
  const last = rows.filter((r) => Number(r.jornada) === maxJ).sort((a, b) => a.pos - b.pos)
  const byTeam = new Map<string, Map<number, number>>()
  for (const r of rows) { const k = String(r.codequipo); if (!byTeam.has(k)) byTeam.set(k, new Map()); byTeam.get(k)!.set(Number(r.jornada), r.pos) }
  const series: CarreraSerie[] = last.map((t, idx) => {
    const m = byTeam.get(String(t.codequipo))!
    let prev = m.get(jornadas[0]) ?? t.pos
    const pos = jornadas.map((j) => { const p = m.get(j); if (p != null) prev = p; return prev })
    return { codequipo: String(t.codequipo), nombre: t.nombre_equipo, ini: iniEq(t.nombre_equipo), color: CARRERA_PAL[idx % CARRERA_PAL.length], pos }
  })
  // Bandas por posición desde la última jornada (zona real), fusionando posiciones consecutivas de la misma familia.
  const famByPos = new Map<number, ZonaFam>()
  for (const r of last) { const f = zonaFamilia(r.zona); if (f) famByPos.set(r.pos, f) }
  const raw: { from: number; to: number; fam: ZonaFam }[] = []
  for (let p = 1; p <= last.length; p++) {
    const f = famByPos.get(p); if (!f) continue
    const prev = raw[raw.length - 1]
    if (prev && prev.fam === f && prev.to === p - 1) prev.to = p
    else raw.push({ from: p, to: p, fam: f })
  }
  return { series, jornadas, bands: raw.map((b) => ({ from: b.from, to: b.to, color: ZONA_FAM_COL[b.fam] })) }
}
