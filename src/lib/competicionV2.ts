// Capa de datos de la FICHA DE COMPETICIÓN v2 (rutas paralelas con sufijo /v2). No toca las rutas
// actuales ni sus componentes. Reutiliza el sistema de color de equipo v2 y las tablas del pipeline.

import { supabase } from '@/lib/supabase'
import { cacheComp } from '@/lib/cacheComp'
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

// Conversión cod<->slug de temporada: fuente única en @/lib/temporadaSlug (relación lineal, sin lista que
// mantener). Se re-exporta para que los componentes de competición la importen desde aquí como antes.
export { codToSlug, slugToCod, universoTemporadas } from '@/lib/temporadaSlug'
export const CATEGORIA_MAP: Record<string, string> = { aficionados: 'AFICIONADO', juveniles: 'JUVENIL' }

// Temporadas (cod) en las que existe esta competición (por slug_comp + categoría), de más nueva a más vieja.
// Data-driven -> alimenta el universo del selector global (techo) y su griseado (link solo donde hay dato);
// una temporada nueva aparece sola. La consulta es barata (una columna) y la página va cacheada por ISR.
export async function getTemporadasCompV2(categoria: string, slugComp: string): Promise<number[]> {
  let q = supabase.from('web_grupos').select('codtemporada').eq('slug_comp', slugComp)
  const cat = CATEGORIA_MAP[categoria]
  if (cat) q = q.eq('categoria', cat)
  const { data } = await q
  return Array.from(new Set((data || []).map((r: any) => r.codtemporada as number))).sort((a, b) => b - a)
}

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
  return cacheComp(async () => {
    const { data } = await supabase.from('web_clasificacion').select(COLS_CLASIFICACION)
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornada).order('pos')
    return (data || []) as unknown as ClasifCompRow[]
  }, ['getClasifV2', codgrupo, codtemporada, jornada], [codgrupo], codtemporada)
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
// web_clasificacion.forma viene como 5 emojis: 🟢 victoria, 🟡 empate, 🔴 derrota. Color por resultado
// (empate en gris; ámbar reservado). Se recorre con [...forma] para separar por code point (los emojis
// ocupan más de un char y split('') los rompería).
export const FORMA_COL: Record<string, string> = { '🟢': 'var(--e3)', '🟡': 'var(--ink-3)', '🔴': 'var(--e0)' }

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
  return cacheComp(async () => {
    const { data } = await supabase.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornada).eq('tipo', tipo).order('rank')
    return (data || []) as any[]
  }, ['getDestacadosV2', codgrupo, codtemporada, jornada, tipo], [codgrupo], codtemporada)
}

// Equipos en forma de UNA jornada (web_equipos_forma).
export async function getEquiposFormaV2(codgrupo: string, codtemporada: number, jornada: number) {
  return cacheComp(async () => {
    const { data } = await supabase.from('web_equipos_forma').select(COLS_EQUIPOS_FORMA)
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornada).order('rank')
    return (data || []) as any[]
  }, ['getEquiposFormaV2', codgrupo, codtemporada, jornada], [codgrupo], codtemporada)
}

// Rankings de TEMPORADA (acumulado hasta la jornada): goleadores/porteros/fantasy rebobinan (snapshot);
// elo_temp es foto-final (no rebobina), como en la ruta actual.
export async function getTopTemporadaV2(codgrupo: string, codtemporada: number, jornada: number) {
  return cacheComp(async () => {
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
  }, ['getTopTemporadaV2', codgrupo, codtemporada, jornada], [codgrupo], codtemporada)
}

// XI Óptimo de temporada (web_xi_optimo tipo temporada, acumulado por jornada).
export async function getXiTemporadaV2(codgrupo: string, codtemporada: number, jornada: number) {
  return cacheComp(async () => (
    fetchSnapshot((q: any) => q.from('web_xi_optimo').select(COLS_XI_OPTIMO)
      .eq('tipo', 'temporada').eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).order('pos_orden'), jornada) as Promise<any[]>
  ), ['getXiTemporadaV2', codgrupo, codtemporada, jornada], [codgrupo], codtemporada)
}

// XI Óptimo de UNA jornada: en copa vive en web_xi_optimo (tipo jornada); en liga, en web_top_jugadores (xi_jornada).
export async function getXiJornadaV2(codgrupo: string, codtemporada: number, jornada: number, isCopa: boolean) {
  return cacheComp(async () => {
    if (isCopa) {
      const { data } = await supabase.from('web_xi_optimo').select(COLS_XI_OPTIMO)
        .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('tipo', 'jornada').eq('jornada', jornada).order('pos_orden')
      return (data || []) as any[]
    }
    return getDestacadosV2(codgrupo, codtemporada, jornada, 'xi_jornada')
  }, ['getXiJornadaV2', codgrupo, codtemporada, jornada, String(isCopa)], [codgrupo], codtemporada)
}

// --- Resultados de una jornada (web_resultados). campo ya poblado; fecha/hora pueden venir NULL. ---
export type ResultadoCompRow = {
  codacta: string | null
  nombre_local: string; escudo_local: string | null; goles_local: number | null
  nombre_visitante: string; escudo_visitante: string | null; goles_visitante: number | null
  fecha: string | null; hora: string | null; campo: string | null
  grupo_label: string | null   // copa fase de grupos: "Grupo A"/"Grupo B" (NULL en liga y eliminatorias)
}
export async function getResultadosV2(codgrupo: string, codtemporada: number, jornada: number): Promise<ResultadoCompRow[]> {
  return cacheComp(async () => {
    const { data, error } = await supabase.from('web_resultados')
      .select('codacta, nombre_local, escudo_local, goles_local, goles_visitante, nombre_visitante, escudo_visitante, fecha, hora, campo, grupo_label')
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornada).order('fecha').order('hora')
    if (error) throw error   // no cachear [] por un error transitorio (ver checklist: caché envenenada)
    return (data || []) as unknown as ResultadoCompRow[]
    // v2-glabel: bump al añadir grupo_label al select; la clave no cambió y quedaban filas cacheadas sin él.
  }, ['getResultadosV2', 'v2-glabel', codgrupo, codtemporada, jornada], [codgrupo], codtemporada)
}

// Clasificación de FASE DE GRUPOS de copa: TODOS los snapshots (matchdays 1..3) de los DOS grupos, de una vez.
// Se filtra por codgrupo_familia (la clave del grupo suelto es el código federativo, distinto por grupo) y por
// la ronda de grupos. El componente cliente elige el matchday (máquina del tiempo) y separa por grupo_label.
export type ClasifCopaRow = ClasifCompRow & { jornada: number; grupo_label: string }
export async function getClasifCopaV2(codgrupoFamilia: string, codtemporada: number, rondaSlug: string): Promise<ClasifCopaRow[]> {
  return cacheComp(async () => {
    const { data, error } = await supabase.from('web_clasificacion').select(`${COLS_CLASIFICACION}, jornada, grupo_label`)
      .eq('codgrupo_familia', codgrupoFamilia).eq('codtemporada', codtemporada).eq('ronda_slug', rondaSlug)
      .order('jornada', { ascending: true }).order('grupo_label', { ascending: true }).order('pos', { ascending: true })
    if (error) throw error   // filtra/selecciona columnas NUEVAS -> no cachear [] si la query falla (ver checklist)
    return (data || []) as unknown as ClasifCopaRow[]
  }, ['getClasifCopaV2', codgrupoFamilia, codtemporada, rondaSlug], [codgrupoFamilia], codtemporada)
}

// nombre_equipo -> codequipo (para enlazar equipos en Resultados; web_resultados no trae codequipo).
// NO se envuelve en cacheComp: devuelve un Map y unstable_cache serializa el resultado (el Map se
// perdería a {}). Se lee siempre junto a getResultadosV2 (ya etiquetada), así que la ruta queda cubierta.
export async function getEquiposMapV2(codgrupo: string, codtemporada: number): Promise<Map<string, string>> {
  // Copa: las filas de clasificación llevan el código FEDERATIVO por grupo (no el fam-*), así que para el grupo
  // de familia se filtra por codgrupo_familia; en liga, por codgrupo. Así los equipos de resultados/goleadores
  // de copa también enlazan.
  const esFam = codgrupo.startsWith('fam-')
  let q = supabase.from('web_clasificacion').select('codequipo, nombre_equipo').eq('codtemporada', codtemporada).eq('jornada', 1)
  q = esFam ? q.eq('codgrupo_familia', codgrupo) : q.eq('codgrupo', codgrupo)
  const { data } = await q
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
  return cacheComp(async () => {
    const { data } = await supabase.from('web_clasificacion')
      .select('codgrupo, pos, codequipo, nombre_equipo, escudo, pj, gf, pts, elo, zona')
      .in('codgrupo', codgrupos).eq('codtemporada', codtemporada).eq('jornada', jornada).order('pos')
    return (data || []) as any[]
  }, ['getGlobalClasifV2', codgrupos.join(','), codtemporada, jornada], codgrupos, codtemporada)
}

// --- Carrera de posiciones: posición por jornada de cada equipo + bandas de zona (de la última jornada). ---
const CARRERA_PAL = ['#d94f4f', '#2f9e6d', '#e0a53f', '#6b8fd6', '#5b6fa8', '#c93f6f', '#9e7a3f', '#7a9e3f', '#3fb0a5', '#8a4fd6', '#3f9ed6', '#a04fd6', '#4fae7a', '#d67a3f', '#6b5fd6', '#8a9ab8', '#5b8fa8', '#b0863f', '#5fae9e', '#c96f9e']
const iniEq = (n: string) => (n || '').replace(/['"]/g, '').split(/\s+/).filter((w) => w.length > 2).slice(0, 1).join('').slice(0, 3).toUpperCase() || (n || '').slice(0, 3).toUpperCase()
export type CarreraSerie = { codequipo: string; nombre: string; ini: string; color: string; pos: number[] }
export type CarreraBand = { from: number; to: number; color: string }
export async function getCarreraV2(codgrupo: string, codtemporada: number): Promise<{ series: CarreraSerie[]; jornadas: number[]; bands: CarreraBand[] }> {
  return cacheComp(async () => {
  // 1) Última jornada: define los equipos de la carrera (orden final + zona para las bandas). Evita traer
  //    series de equipos que no están en la tabla final (retirados, filas sueltas).
  const { data: jr } = await supabase.from('web_clasificacion').select('jornada')
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).order('jornada', { ascending: false }).limit(1)
  const maxJ = jr && jr[0] ? Number(jr[0].jornada) : null
  if (maxJ == null) return { series: [], jornadas: [], bands: [] }
  const { data: lastData } = await supabase.from('web_clasificacion').select('codequipo, nombre_equipo, pos, zona')
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', maxJ).order('pos')
  const last = (lastData || []) as any[]
  if (!last.length) return { series: [], jornadas: [], bands: [] }
  const codequipos = last.map((t) => String(t.codequipo))
  // 2) Serie de posición por jornada, SOLO de esos equipos.
  const { data } = await supabase.from('web_clasificacion').select('jornada, codequipo, pos')
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).in('codequipo', codequipos).order('jornada').order('pos')
  const rows = (data || []) as any[]
  if (!rows.length) return { series: [], jornadas: [], bands: [] }
  const jornadas = Array.from(new Set(rows.map((r) => Number(r.jornada)))).sort((a, b) => a - b)
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
  }, ['getCarreraV2', codgrupo, codtemporada], [codgrupo], codtemporada)
}

// --- Aside: líderes (goleador/portero/mejor ELO) y cifras de la competición. ---
export async function getLideresV2(codgrupo: string, codtemporada: number) {
  return cacheComp(async () => {
    const [top, al] = await Promise.all([
      supabase.from('web_top_jugadores')
        .select('tipo, jornada, codjugador, nombre, posicion, codequipo, nombre_equipo, escudo, goles, elo')
        .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada)
        .in('tipo', ['goleadores_temp', 'porteros_temp', 'elo_temp']).eq('rank', 1),
      // "Más tarjetas": no hay ranking de tarjetas por jugador de temporada; se usa la mejor fuente
      // disponible, web_alertas_tarjetas (amarillas de ciclo + simples). Cubre solo a los que tienen
      // registro disciplinario, así que es aproximado (ver DECISIONES C-lideres).
      supabase.from('web_alertas_tarjetas')
        .select('codjugador, nombre, posicion, codequipo, nombre_equipo, escudo, amarillas_ciclo, amarillas_simples')
        .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada),
    ])
    const rows = (top.data || []) as any[]
    const pick = (t: string) => rows.filter((r) => r.tipo === t).sort((a, b) => (Number(b.jornada) || 0) - (Number(a.jornada) || 0))[0] || null
    const tarj = ((al.data || []) as any[])
      .map((r) => ({ ...r, amarillas: (r.amarillas_ciclo || 0) + (r.amarillas_simples || 0) }))
      .sort((a, b) => b.amarillas - a.amarillas)[0] || null
    return { goleador: pick('goleadores_temp'), portero: pick('porteros_temp'), elo: pick('elo_temp'), tarjetas: tarj }
  }, ['getLideresV2', codgrupo, codtemporada], [codgrupo], codtemporada)
}

export type CifrasComp = {
  disputados: number; totalPartidos: number; goles: number; mediaGoles: number | null
  vLocalPct: number; empPct: number; vVisitPct: number
  amarillas: number; dobles: number; rojas: number; p0: number
}
export async function getCifrasV2(codgrupo: string, codtemporada: number, jornada: number, clasif: ClasifCompRow[], totalJornadas: number): Promise<CifrasComp> {
  return cacheComp(async () => {
    const equipos = clasif.length
    const disputados = Math.round(clasif.reduce((s, r) => s + (r.pj || 0), 0) / 2)
    const goles = clasif.reduce((s, r) => s + (r.gf || 0), 0)
    const p0 = clasif.reduce((s, r) => s + (r.p0 || 0), 0)
    const totalPartidos = totalJornadas && equipos ? Math.round((totalJornadas * equipos) / 2) : disputados
    const [{ data: res }, jl] = await Promise.all([
      supabase.from('web_resultados').select('goles_local, goles_visitante').eq('codgrupo', codgrupo).eq('codtemporada', codtemporada),
      fetchSnapshot((q: any) => q.from('web_juego_limpio').select('amarillas, dobles, rojas, jornada').eq('codgrupo', codgrupo).eq('codtemporada', codtemporada), jornada),
    ])
    let vl = 0, em = 0, vv = 0
    for (const m of (res || []) as any[]) {
      if (m.goles_local == null || m.goles_visitante == null) continue
      if (m.goles_local > m.goles_visitante) vl++
      else if (m.goles_local < m.goles_visitante) vv++
      else em++
    }
    const tot = vl + em + vv || 1
    const jlRows = jl as any[]
    return {
      disputados, totalPartidos, goles, mediaGoles: disputados ? goles / disputados : null,
      vLocalPct: Math.round((vl / tot) * 100), empPct: Math.round((em / tot) * 100), vVisitPct: Math.round((vv / tot) * 100),
      amarillas: jlRows.reduce((s, r) => s + (r.amarillas || 0), 0),
      dobles: jlRows.reduce((s, r) => s + (r.dobles || 0), 0),
      rojas: jlRows.reduce((s, r) => s + (r.rojas || 0), 0),
      p0,
    }
  }, ['getCifrasV2', codgrupo, codtemporada, jornada, totalJornadas], [codgrupo], codtemporada)
}

// Goles por equipo en la jornada, derivados de web_resultados (no hay tabla). Se AGREGA por equipo: en LIGA
// cada equipo juega una vez (no-op), pero en COPA la fase de grupos se muestra como una sola "jornada" donde un
// equipo juega VARIOS partidos -> sin agregar salían filas duplicadas (una por partido). Clave: codequipo, o el
// nombre si no resuelve.
export type GolEquipoRow = { nombre: string; escudo: string | null; codequipo: string | null; goles: number }
export function golesEquipoJornada(res: ResultadoCompRow[], equiposMap: Map<string, string>): GolEquipoRow[] {
  const acc = new Map<string, GolEquipoRow>()
  const add = (nombre: string, escudo: string | null, goles: number | null) => {
    if (goles == null) return
    const codequipo = equiposMap.get(nombre) ?? null
    const key = codequipo ?? nombre
    const prev = acc.get(key)
    if (prev) prev.goles += goles
    else acc.set(key, { nombre, escudo, codequipo, goles })
  }
  for (const r of res) {
    add(r.nombre_local, r.escudo_local, r.goles_local)
    add(r.nombre_visitante, r.escudo_visitante, r.goles_visitante)
  }
  return Array.from(acc.values()).filter((g) => g.goles > 0).sort((a, b) => b.goles - a.goles)
}

// Suspendidos para la jornada SIGUIENTE a la seleccionada (web_suspendidos).
export async function getSuspendidosV2(codgrupo: string, codtemporada: number, jornadaSiguiente: number) {
  return cacheComp(async () => {
    const { data } = await supabase.from('web_suspendidos')
      .select('codjugador, nombre, posicion, codequipo, nombre_equipo, escudo, motivo')
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornadaSiguiente).order('nombre_equipo')
    return (data || []) as any[]
  }, ['getSuspendidosV2', codgrupo, codtemporada, jornadaSiguiente], [codgrupo], codtemporada)
}

// Datos por partido de UNA jornada para unos jugadores (web_jugador_partidos): titular, minutos, goles,
// tarjetas, puntos, goles encajados. Para la fila completa del Top 5 (web_top_jugadores no los expone).
// NO se envuelve en cacheComp: devuelve un Map (unstable_cache lo perdería a {}). Se lee junto a los
// destacados/XI de jornada (ya etiquetados), así que la ruta queda cubierta.
export async function getPartidosJornadaV2(codgrupo: string, codtemporada: number, jornada: number, codjugadores: string[]) {
  const m = new Map<string, any>()
  if (!codjugadores.length) return m
  const { data } = await supabase.from('web_jugador_partidos')
    .select('codjugador, titular, minutos, goles, amarillas, dobles_amarilla, rojas, puntos, goles_encajados, jugado')
    .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada).eq('jornada', jornada).eq('jugado', true).in('codjugador', codjugadores)
  for (const r of (data || []) as any[]) if (!m.has(String(r.codjugador))) m.set(String(r.codjugador), r)
  return m
}

// Goles marcados por tramo del partido en TODA la competición (suma de web_goles_tramos de sus equipos).
const TRAMOS_ORDEN = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90', '90+']
export async function getTramosCompeticionV2(codgrupo: string, codtemporada: number) {
  return cacheComp(async () => {
    const { data } = await supabase.from('web_goles_tramos').select('tramo, gf')
      .eq('codgrupo', codgrupo).eq('codtemporada', codtemporada)
    const m = new Map<string, number>()
    for (const r of (data || []) as any[]) m.set(r.tramo, (m.get(r.tramo) || 0) + (r.gf || 0))
    return TRAMOS_ORDEN.map((t) => ({ tramo: t, gf: m.get(t) || 0 }))
  }, ['getTramosCompeticionV2', codgrupo, codtemporada], [codgrupo], codtemporada)
}

// --- GLOBAL: rankings de JUGADOR agregando los grupos de la categoria. NO se suman puntos de equipo ni
// se ordena por puntos globales (los grupos no juegan entre si). Solo se fusionan rankings individuales
// (goleadores/porteros/fantasy/elo) por su valor. ---
export async function getGlobalTopTemporadaV2(codgrupos: string[], codtemporada: number, jornada: number) {
  if (!codgrupos.length) return { goleadores: [], porteros: [], fantasy: [], elo: [] }
  return cacheComp(async () => {
    const [snap, elo] = await Promise.all([
      supabase.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
        .in('codgrupo', codgrupos).eq('codtemporada', codtemporada)
        .in('tipo', ['goleadores_temp', 'porteros_temp', 'fantasy_temp']).eq('jornada', jornada),
      supabase.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
        .in('codgrupo', codgrupos).eq('codtemporada', codtemporada).eq('tipo', 'elo_temp').is('jornada', null),
    ])
    const all = [...((snap.data || []) as any[]), ...((elo.data || []) as any[])]
    const top = (tipo: string, key: string) => all.filter((j) => j.tipo === tipo)
      .sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0)).slice(0, 10)
      .map((j, i) => ({ ...j, rank: i + 1 }))
    return { goleadores: top('goleadores_temp', 'goles'), porteros: top('porteros_temp', 'goles'), fantasy: top('fantasy_temp', 'pts_fantasy'), elo: top('elo_temp', 'elo') }
  }, ['getGlobalTopTemporadaV2', codgrupos.join(','), codtemporada, jornada], codgrupos, codtemporada)
}

// GLOBAL: destacados de jornada agregando grupos (mvp / equipos en forma). Top 5 por valor.
export async function getGlobalMvpV2(codgrupos: string[], codtemporada: number, jornada: number) {
  if (!codgrupos.length) return [] as any[]
  return cacheComp(async () => {
    const { data } = await supabase.from('web_top_jugadores').select(COLS_TOP_JUGADORES)
      .in('codgrupo', codgrupos).eq('codtemporada', codtemporada).eq('tipo', 'mvp_jornada').eq('jornada', jornada)
    return ((data || []) as any[]).sort((a, b) => (Number(b.pts_fantasy) || 0) - (Number(a.pts_fantasy) || 0)).slice(0, 5).map((j, i) => ({ ...j, rank: i + 1 }))
  }, ['getGlobalMvpV2', codgrupos.join(','), codtemporada, jornada], codgrupos, codtemporada)
}
export async function getGlobalEquiposFormaV2(codgrupos: string[], codtemporada: number, jornada: number) {
  if (!codgrupos.length) return [] as any[]
  return cacheComp(async () => {
    const { data } = await supabase.from('web_equipos_forma').select(COLS_EQUIPOS_FORMA)
      .in('codgrupo', codgrupos).eq('codtemporada', codtemporada).eq('jornada', jornada)
    return ((data || []) as any[]).sort((a, b) => (Number(b.pts_fantasy) || 0) - (Number(a.pts_fantasy) || 0)).slice(0, 5).map((e, i) => ({ ...e, rank: i + 1 }))
  }, ['getGlobalEquiposFormaV2', codgrupos.join(','), codtemporada, jornada], codgrupos, codtemporada)
}

// --- Tarjetas de TEMPORADA (grupo o global): juego limpio (web_juego_limpio) + sancionados
// (web_alertas_tarjetas, foto-final). Reciben lista de grupos -> valen para grupo (uno) y global (varios). ---
export async function getJuegoLimpioV2(codgrupos: string[], codtemporada: number, jornada: number) {
  if (!codgrupos.length) return [] as any[]
  return cacheComp(async () => {
    // Rebobina por equipo: la fila de mayor jornada <= la pedida. Robusto ante grupos de distinta longitud
    // (categorías con grupos de 22-30 partidos) y ante la foto-final por jornada.
    const { data } = await supabase.from('web_juego_limpio')
      .select('codequipo, nombre_equipo, escudo, amarillas, dobles, rojas, amarillas_tec, dobles_tec, rojas_tec, jornada')
      .in('codgrupo', codgrupos).eq('codtemporada', codtemporada).lte('jornada', jornada)
    const best = new Map<string, any>()
    for (const r of (data || []) as any[]) {
      const k = String(r.codequipo)
      const cur = best.get(k)
      if (!cur || (r.jornada || 0) > (cur.jornada || 0)) best.set(k, r)
    }
    return Array.from(best.values())
  }, ['getJuegoLimpioV2', codgrupos.join(','), codtemporada, jornada], codgrupos, codtemporada)
}
export async function getAlertasV2(codgrupos: string[], codtemporada: number) {
  if (!codgrupos.length) return [] as any[]
  return cacheComp(async () => {
    const { data } = await supabase.from('web_alertas_tarjetas')
      .select('codjugador, nombre, posicion, codequipo, nombre_equipo, escudo, amarillas_ciclo, amarillas_simples, dobles_amarillas, rojas_directas, ciclos_completados, ciclo_umbral')
      .in('codgrupo', codgrupos).eq('codtemporada', codtemporada)
    return (data || []) as any[]
  }, ['getAlertasV2', codgrupos.join(','), codtemporada], codgrupos, codtemporada)
}

// --- GLOBAL: XI óptimo de la competición (el pipeline lo calcula con normalización entre grupos y lo
// guarda como tipo temporada_global / jornada_global). Solo se consume, no se recalcula. ---
export async function getGlobalXiV2(codgrupos: string[], codtemporada: number, tipo: 'temporada_global' | 'jornada_global', jornada?: number) {
  if (!codgrupos.length) return [] as any[]
  return cacheComp(async () => {
    let q = supabase.from('web_xi_optimo').select(COLS_XI_OPTIMO)
      .eq('codtemporada', codtemporada).in('codgrupo', codgrupos).eq('tipo', tipo)
    if (jornada != null) q = q.eq('jornada', jornada)
    const { data } = await q.order('pos_orden')
    return (data || []) as any[]
  }, ['getGlobalXiV2', codgrupos.join(','), codtemporada, tipo, jornada ?? 'null'], codgrupos, codtemporada)
}

// GLOBAL: reparto V/E/D de toda la categoría (cuenta partidos, NO suma puntos). Porcentajes agregados.
export async function getGlobalCifrasV2(codgrupos: string[], codtemporada: number) {
  if (!codgrupos.length) return { vLocalPct: 0, empPct: 0, vVisitPct: 0, disputados: 0 }
  return cacheComp(async () => {
    const { data } = await supabase.from('web_resultados').select('goles_local, goles_visitante')
      .in('codgrupo', codgrupos).eq('codtemporada', codtemporada)
    let vl = 0, em = 0, vv = 0
    for (const m of (data || []) as any[]) {
      if (m.goles_local == null || m.goles_visitante == null) continue
      if (m.goles_local > m.goles_visitante) vl++
      else if (m.goles_local < m.goles_visitante) vv++
      else em++
    }
    const tot = vl + em + vv || 1
    return { vLocalPct: Math.round((vl / tot) * 100), empPct: Math.round((em / tot) * 100), vVisitPct: Math.round((vv / tot) * 100), disputados: vl + em + vv }
  }, ['getGlobalCifrasV2', codgrupos.join(','), codtemporada], codgrupos, codtemporada)
}

// GLOBAL: perfil goleador de cada equipo de la categoría (gf/gc a foto-final), ordenado por goles marcados.
// No es una tabla por puntos: cada fila es el equipo con su grupo; no se comparan posiciones entre grupos.
export async function getGlobalTeamGoalsV2(codgrupos: string[], codtemporada: number, jornada: number) {
  if (!codgrupos.length) return [] as any[]
  return cacheComp(async () => {
    const { data } = await supabase.from('web_clasificacion')
      .select('codgrupo, codequipo, nombre_equipo, escudo, gf, gc')
      .in('codgrupo', codgrupos).eq('codtemporada', codtemporada).eq('jornada', jornada)
    return ((data || []) as any[]).sort((a, b) => (b.gf || 0) - (a.gf || 0))
  }, ['getGlobalTeamGoalsV2', codgrupos.join(','), codtemporada, jornada], codgrupos, codtemporada)
}

// GLOBAL: goles por tramo del partido en toda la categoría (suma de web_goles_tramos de todos los grupos).
export async function getGlobalTramosV2(codgrupos: string[], codtemporada: number) {
  if (!codgrupos.length) return TRAMOS_ORDEN.map((t) => ({ tramo: t, gf: 0 }))
  return cacheComp(async () => {
    const { data } = await supabase.from('web_goles_tramos').select('tramo, gf')
      .in('codgrupo', codgrupos).eq('codtemporada', codtemporada)
    const m = new Map<string, number>()
    for (const r of (data || []) as any[]) m.set(r.tramo, (m.get(r.tramo) || 0) + (r.gf || 0))
    return TRAMOS_ORDEN.map((t) => ({ tramo: t, gf: m.get(t) || 0 }))
  }, ['getGlobalTramosV2', codgrupos.join(','), codtemporada], codgrupos, codtemporada)
}

// --- GLOBAL: Panorama (líderes + cifras) de toda la categoría, para el mismo componente Panorama. ---
// Líderes: top-1 de cada ranking individual agregado + "más tarjetas" (aprox, web_alertas).
export async function getGlobalLideresV2(codgrupos: string[], codtemporada: number, jornada: number) {
  if (!codgrupos.length) return { goleador: null, portero: null, elo: null, tarjetas: null }
  return cacheComp(async () => {
    const [top, al] = await Promise.all([
      getGlobalTopTemporadaV2(codgrupos, codtemporada, jornada),
      getAlertasV2(codgrupos, codtemporada),
    ])
    const tarjetas = (al as any[])
      .map((r) => ({ ...r, amarillas: (r.amarillas_ciclo || 0) + (r.amarillas_simples || 0) }))
      .sort((a, b) => b.amarillas - a.amarillas)[0] || null
    return { goleador: top.goleadores[0] || null, portero: top.porteros[0] || null, elo: top.elo[0] || null, tarjetas }
  }, ['getGlobalLideresV2', codgrupos.join(','), codtemporada, jornada], codgrupos, codtemporada)
}

// Cifras completas de la categoría (agrega los grupos; cuenta partidos, NO suma puntos).
export async function getGlobalCifrasFullV2(grupos: any[], codtemporada: number, jornada: number): Promise<CifrasComp> {
  const codgrupos = grupos.map((g) => String(g.codgrupo))
  if (!codgrupos.length) return { disputados: 0, totalPartidos: 0, goles: 0, mediaGoles: null, vLocalPct: 0, empPct: 0, vVisitPct: 0, amarillas: 0, dobles: 0, rojas: 0, p0: 0 }
  return cacheComp(async () => {
    const [clasRes, resRes, jl] = await Promise.all([
      supabase.from('web_clasificacion').select('codgrupo, pj, gf, p0').in('codgrupo', codgrupos).eq('codtemporada', codtemporada).eq('jornada', jornada),
      supabase.from('web_resultados').select('goles_local, goles_visitante').in('codgrupo', codgrupos).eq('codtemporada', codtemporada),
      getJuegoLimpioV2(codgrupos, codtemporada, jornada),
    ])
    const clas = (clasRes.data || []) as any[]
    const disputados = Math.round(clas.reduce((s, r) => s + (r.pj || 0), 0) / 2)
    const goles = clas.reduce((s, r) => s + (r.gf || 0), 0)
    const p0 = clas.reduce((s, r) => s + (r.p0 || 0), 0)
    const eqPorGrupo = new Map<string, number>()
    for (const r of clas) eqPorGrupo.set(String(r.codgrupo), (eqPorGrupo.get(String(r.codgrupo)) || 0) + 1)
    let totalPartidos = 0
    for (const g of grupos) totalPartidos += Math.round(((g.total_jornadas || 0) * (eqPorGrupo.get(String(g.codgrupo)) || 0)) / 2)
    if (!totalPartidos) totalPartidos = disputados
    let vl = 0, em = 0, vv = 0
    for (const m of (resRes.data || []) as any[]) {
      if (m.goles_local == null || m.goles_visitante == null) continue
      if (m.goles_local > m.goles_visitante) vl++
      else if (m.goles_local < m.goles_visitante) vv++
      else em++
    }
    const tot = vl + em + vv || 1
    return {
      disputados, totalPartidos, goles, mediaGoles: disputados ? goles / disputados : null,
      vLocalPct: Math.round((vl / tot) * 100), empPct: Math.round((em / tot) * 100), vVisitPct: Math.round((vv / tot) * 100),
      amarillas: jl.reduce((s, r) => s + (r.amarillas || 0), 0),
      dobles: jl.reduce((s, r) => s + (r.dobles || 0), 0),
      rojas: jl.reduce((s, r) => s + (r.rojas || 0), 0),
      p0,
    }
  }, ['getGlobalCifrasFullV2', codgrupos.join(','), codtemporada, jornada], codgrupos, codtemporada)
}
