// Utilidades de la FICHA DE EQUIPO. Reutiliza helpers genéricos de la ficha de jugador
// (slugify, codFromSlug, tempLabel, fechaISO) y la etiqueta de temporada. El escudo se lee directo
// de las filas (nombre de fichero del bucket, como el resto del sitio) — igual que en la ficha de jugador.

import { supabase } from '@/lib/supabase'
import { slugify, codFromSlug, tempLabel } from '@/lib/jugador'
import { getSueloVivo } from '@/lib/temporadas'
import { cacheEquipo, cacheTagged } from '@/lib/cacheComp'
import { FAMILIA_SLUGS, OLD_A_FAMILIA } from '@/lib/competiciones'

export { slugify, codFromSlug, tempLabel }

// rama de web_equipo -> segmento de URL de la vista de grupo.
export const RAMA_SLUG: Record<string, string> = { aficionados: 'aficionados', juvenil: 'juveniles' }

// Slug canónico de una ficha de equipo: {codequipo}-{nombre-slug}. El nombre de equipo es plano
// (no "APELLIDOS, NOMBRE"), así que se slugifica tal cual.
export function equipoSlug(codequipo: string | number, nombre: string | null): string {
  const suf = slugify(nombre || '')
  return suf ? `${codequipo}-${suf}` : String(codequipo)
}
export function equipoHref(codequipo: string | number | null | undefined, nombre: string | null, temporada?: string | null): string | null {
  if (codequipo == null) return null
  const base = `/madrid/equipo/${equipoSlug(codequipo, nombre)}`
  return temporada ? `${base}?temporada=${temporada}` : base
}

// Ficha mínima de un jugador para los movimientos: `enlazable` = tiene ficha en web_jugador (adulto,
// se enlaza + nombre canónico); los menores llegan sin ficha pero CON posición (de la plantilla
// juvenil) -> pastilla sí, enlace no.
export type FichaMov = { nombre: string | null; pos: string | null; estimada: boolean; enlazable: boolean }

// FORMA del hero: resultados del equipo en su grupo (web_resultados no trae codequipo -> se filtra por
// NOMBRE, como local o visitante; dos .eq en vez de .or para no pelear con comillas/comas del nombre).
export type ResultadoRow = {
  jornada: number; fecha: string | null
  goles_local: number | null; goles_visitante: number | null
  nombre_local: string; nombre_visitante: string
}
export async function getResultadosGrupo(nombre: string | null, codgrupo: string | null | undefined): Promise<ResultadoRow[]> {
  if (!nombre || !codgrupo) return []
  return cacheTagged(async () => {
    const cols = 'jornada, fecha, goles_local, goles_visitante, nombre_local, nombre_visitante'
    const [loc, vis] = await Promise.all([
      supabase.from('web_resultados').select(cols).eq('codgrupo', String(codgrupo)).eq('nombre_local', nombre),
      supabase.from('web_resultados').select(cols).eq('codgrupo', String(codgrupo)).eq('nombre_visitante', nombre),
    ])
    return [...((loc.data || []) as any[]), ...((vis.data || []) as any[])] as ResultadoRow[]
  }, ['getResultadosGrupo', String(nombre), String(codgrupo)], [`comp:${codgrupo}`])
}

// Un chip de racha/forma: signo (para color), jornada, marcador (orden absoluto local-visitante) y
// rival — para el tooltip "Jnn · marcador vs Rival". Compartido por hero de equipo y de jugador.
export type ChipRacha = { signo: 'G' | 'E' | 'P'; jornada: number | null; marcador: string; rival: string | null }

// Resumen de forma (últimos 5 JUGADOS, orden jornada ASC = más reciente a la derecha) + última victoria
// (por JORNADA, entero — nunca comparando el string DD/MM/YYYY). Perspectiva del equipo por su nombre.
export function resumenForma(rows: ResultadoRow[], nombre: string): {
  forma: ChipRacha[]
  ultimaVictoria: { fecha: string | null; jornada: number } | null
} {
  const jugados = rows
    .filter((r) => r.goles_local != null && r.goles_visitante != null)
    .sort((a, b) => a.jornada - b.jornada)
  const persp = jugados.map((r) => {
    const local = r.nombre_local === nombre
    const gf = (local ? r.goles_local : r.goles_visitante) as number
    const gc = (local ? r.goles_visitante : r.goles_local) as number
    return {
      jornada: r.jornada, fecha: r.fecha,
      signo: (gf > gc ? 'G' : gf < gc ? 'P' : 'E') as 'G' | 'E' | 'P',
      marcador: `${r.goles_local}-${r.goles_visitante}`,               // absoluto local-visitante
      rival: (local ? r.nombre_visitante : r.nombre_local) as string,
    }
  })
  const victorias = persp.filter((p) => p.signo === 'G')
  return {
    forma: persp.slice(-5).map((p) => ({ signo: p.signo, jornada: p.jornada, marcador: p.marcador, rival: p.rival })),
    ultimaVictoria: victorias.length ? victorias[victorias.length - 1] : null,
  }
}

// Grupos (liga + copa) del equipo POR temporada, para acotar la búsqueda de partidos por nombre (el
// juvenil y el aficionado de un club se llaman IGUAL; sin acotar, el filtro por nombre pesca la otra
// rama). Liga desde web_equipo_temporadas; copas desde el JSONB web_equipo.copas. Devuelve
// { codtemporada -> [codgrupo, ...] }.
export async function getGruposPorTemporada(codequipo: string, temporadasRows: { codtemporada: string | number; codgrupo: string | null }[]): Promise<Record<string, string[]>> {
  return cacheEquipo(async () => {
    const map: Record<string, Set<string>> = {}
    const add = (t: string | number | null, g: string | null) => {
      if (t == null || !g) return
      ;(map[String(t)] ??= new Set<string>()).add(String(g))
    }
    for (const r of temporadasRows) add(r.codtemporada, r.codgrupo)
    const { data } = await supabase.from('web_equipo').select('copas').eq('codequipo', String(codequipo)).limit(1).maybeSingle()
    const copas = (data as { copas?: unknown } | null)?.copas
    // Copa por FAMILIA: usa el codgrupo de la familia (fam-*), que tiene TODAS las rondas, los mismos
    // codacta y el tipo correcto (COPA/PLAYOFF). Así PartidosEquipo deja de depender de las filas viejas
    // de copa -> el pipeline puede borrarlas. Fallback al codgrupo viejo si aún no hubiera familia.
    if (Array.isArray(copas)) for (const c of copas as any[]) add(c.codtemporada, c.codgrupo_familia ?? c.codgrupo)
    const out: Record<string, string[]> = {}
    for (const k in map) out[k] = Array.from(map[k])
    return out
  }, ['getGruposPorTemporada', codequipo, temporadasRows.map((r) => `${r.codtemporada}:${r.codgrupo}`).join(',')], codequipo)
}

// Días desde una fecha DD/MM/YYYY hasta hoy (aritmética de fechas, no comparación de strings).
export function diasDesdeDMY(fecha: string | null): number | null {
  const m = (fecha || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const d = new Date(+m[3], +m[2] - 1, +m[1])
  return Math.floor((new Date().getTime() - d.getTime()) / 86400000)
}

// Info de un grupo (por codgrupo) para construir el enlace a su vista. Reutilizable por la ficha de
// jugador (pastilla de competición del hero) y donde haga falta resolver un grupo desde su código.
export async function getGrupoInfo(codgrupo: string | null | undefined) {
  if (!codgrupo) return null
  const { data } = await supabase.from('web_grupos')
    .select('slug_comp, slug_grupo, jornada_actual, categoria, tipo, codtemporada')
    .eq('codgrupo', String(codgrupo)).limit(1)
  return (data && data[0]) as Record<string, any> | null
}

// URL de la vista de un grupo a partir de su fila de web_grupos (liga -> clasificación; copa -> resultados).
export function grupoHref(g: Record<string, any> | null | undefined): string | null {
  if (!g || !g.slug_comp || !g.slug_grupo) return null
  const rama = String(g.categoria).toUpperCase() === 'JUVENIL' ? 'juveniles' : 'aficionados'
  const entrada = g.tipo && g.tipo !== 'LIGA' ? 'resultados' : 'clasificacion'
  return `/madrid/${rama}/${g.slug_comp}/${g.slug_grupo}/${tempLabel(g.codtemporada)}/jornada-${g.jornada_actual || 1}/${entrada}`
}

// COPAS del equipo en la temporada en curso. Fuente: columna JSONB web_equipo.copas. Cada entrada
// real: { codtemporada, competicion, codgrupo(=codcompeticion), slug_comp, estado_label }. La web
// filtra por temporada en curso y construye el href de la vista de copa resolviendo el codgrupo.
export const COPAS_HABILITADO = true

// Forma REAL de cada entrada en el JSONB. Fase 3: además del grupo suelto de esa ronda, trae el modelo
// de FAMILIA (slug_familia estable + codgrupo_familia) y la ronda (slug + label) donde quedó el equipo.
type CopaRaw = {
  codtemporada: string
  competicion: string
  codgrupo: string
  slug_comp: string
  estado_label: string | null
  slug_familia?: string | null
  codgrupo_familia?: string | null
  ronda_slug?: string | null
  ronda_label?: string | null
}

// Lo que consume CopasLinea / CopasTemporada (nombre + familia -> sello/nombre corto/color; estado; enlace).
export type CopaEquipo = {
  nombre_comp: string
  slug_familia: string | null
  estado: string | null
  href: string | null
}

// Slug de FAMILIA de una copa. El JSONB de honores (web_equipo.copas) trae el slug_comp de la EDICIÓN/ronda
// suelta (p.ej. 'copa-de-aficionados-rffm-2025-2026'), pero la página de copa vive bajo la FAMILIA
// ('copa-rffm', codgrupo fam-<slug>-t<NN>). Preferimos el slug_familia si el pipeline lo emite; si no, lo
// derivamos con OLD_A_FAMILIA — el MISMO mapeo que usa competición para su 308 (o el propio slug si ya es de
// familia). Sin esto el href salía null y las pastillas de copa quedaban sin enlace (a diferencia de la liga).
const familiaDeCopa = (c: CopaRaw): string | null =>
  c.slug_familia ?? (FAMILIA_SLUGS.has(c.slug_comp) ? c.slug_comp : (OLD_A_FAMILIA[c.slug_comp] ?? null))
// codgrupo de la familia en web_grupos (patrón fam-<slug>-t<codtemporada>). Exportado: el JSONB copas trae el
// codgrupo de la EDICIÓN suelta (no el de familia, y a veces sin codgrupo_familia); los resultados/rondas
// viven bajo la familia, así que hay que DERIVARLO, no leer el campo (que puede faltar).
export const codgrupoFamilia = (c: CopaRaw): string | null => {
  const fs = familiaDeCopa(c)
  return fs ? `fam-${fs}-t${c.codtemporada}` : (c.codgrupo_familia ?? null)
}

// Resuelve un lote de filas crudas de copa a CopaEquipo[]. El href apunta a la vista de la FAMILIA en
// esa temporada y a la RONDA donde quedó el equipo (slug/slug_grupo de la familia + ronda_slug;
// "Eliminado en Semifinales" -> esas semifinales). Si la familia aún no está en web_grupos -> href null:
// la pastilla se pinta igual y se hará navegable sola cuando aterrice.
async function resolveCopaRows(rows: CopaRaw[]): Promise<(CopaEquipo & { codtemporada: string })[]> {
  if (rows.length === 0) return []
  const famCods = Array.from(new Set(rows.map(codgrupoFamilia).filter(Boolean) as string[]))
  const { data: fams } = famCods.length
    ? await supabase.from('web_grupos').select('codgrupo, slug_comp, slug_grupo, categoria').in('codgrupo', famCods)
    : { data: [] as any[] }
  const fmap = new Map((fams || []).map((g: any) => [String(g.codgrupo), g]))
  return rows.map((c) => {
    const famCod = codgrupoFamilia(c)
    const fam = famCod ? fmap.get(famCod) : null
    const rama = fam && String(fam.categoria).toUpperCase() === 'JUVENIL' ? 'juveniles' : 'aficionados'
    const ronda = c.ronda_slug || 'final'
    // href solo si la familia existe en web_grupos (navegable); usa su slug_comp/slug_grupo reales.
    const href = fam
      ? `/madrid/${rama}/${fam.slug_comp}/${fam.slug_grupo}/${tempLabel(c.codtemporada)}/${ronda}/resultados`
      : null
    // slug_familia (para sello/nombre corto de la pastilla): el de la familia confirmada, o el derivado.
    const slugFam = fam ? String(fam.slug_comp) : familiaDeCopa(c)
    return { nombre_comp: c.competicion, slug_familia: slugFam, estado: c.estado_label, href, codtemporada: String(c.codtemporada) }
  })
}

// Copas de la temporada VIVA (hero, línea CopasLinea).
async function resolveCopas(raw: unknown): Promise<CopaEquipo[]> {
  if (!COPAS_HABILITADO || !Array.isArray(raw)) return []
  const suelo = String(await getSueloVivo())
  const copasT = (raw as CopaRaw[]).filter((c) => String(c.codtemporada) === suelo)
  return resolveCopaRows(copasT)
}

// Copas de TODAS las temporadas, agrupadas por codtemporada -> para el bloque Temporadas (honores por
// año, junto al badge de liga). El hero sigue mostrando solo la viva; aquí salen las históricas.
export async function getCopasPorTemporada(codequipo: string | number | null | undefined): Promise<Record<string, CopaEquipo[]>> {
  if (!COPAS_HABILITADO || codequipo == null) return {}
  return cacheEquipo(async () => {
    const { data } = await supabase.from('web_equipo').select('copas').eq('codequipo', String(codequipo)).limit(1).maybeSingle()
    const raw = (data as { copas?: unknown } | null)?.copas
    if (!Array.isArray(raw)) return {}
    const resolved = await resolveCopaRows(raw as CopaRaw[])
    const out: Record<string, CopaEquipo[]> = {}
    for (const c of resolved) (out[c.codtemporada] ??= []).push({ nombre_comp: c.nombre_comp, slug_familia: c.slug_familia, estado: c.estado, href: c.href })
    return out
  }, ['getCopasPorTemporada', String(codequipo)], codequipo)
}

export async function getCopasEquipo(codequipo: string | number | null | undefined): Promise<CopaEquipo[]> {
  if (!COPAS_HABILITADO || codequipo == null) return []
  return cacheEquipo(async () => {
    const { data, error } = await supabase.from('web_equipo').select('copas').eq('codequipo', String(codequipo)).limit(1).maybeSingle()
    if (error || !data) return []
    return resolveCopas((data as { copas?: unknown }).copas)
  }, ['getCopasEquipo', String(codequipo)], codequipo)
}

// Copas + posición en liga del equipo (una sola query a web_equipo). Para el hero de la ficha de
// jugador: la pastilla de competición incluye la posición del equipo actual y la línea de copas.
export async function getEquipoActualInfo(codequipo: string | number | null | undefined): Promise<{ copas: CopaEquipo[]; posicionActual: number | null }> {
  if (codequipo == null) return { copas: [], posicionActual: null }
  return cacheEquipo(async () => {
    const { data } = await supabase.from('web_equipo').select('copas, posicion_actual').eq('codequipo', String(codequipo)).limit(1).maybeSingle()
    if (!data) return { copas: [], posicionActual: null }
    return { copas: await resolveCopas((data as { copas?: unknown }).copas), posicionActual: (data as { posicion_actual?: number | null }).posicion_actual ?? null }
  }, ['getEquipoActualInfo', String(codequipo)], codequipo)
}

// Columnas explícitas de los fetchers (cotejadas con el DDL de _equipos_export.py).
export const COLS_EQUIPO =
  'codequipo, nombre, escudo, club_root, rama, categoria_nivel, nombre_comp, codgrupo, grupo_nombre, ' +
  'codtemporada, activo, posicion_actual, elo_actual, elo_max, temporada_elo_max, elo_serie, ' +
  'posicion_juego_limpio, ta_total, tr_total, td_total, n_campeonatos, n_ascensos, n_descensos, n_playoffs, ' +
  'pj_total, gf_total, gc_total, temporadas'

export const COLS_EQUIPO_TEMPORADAS =
  'codtemporada, nombre_comp, categoria_nivel, rama, codgrupo, grupo_nombre, pj, pts, posicion_final, gf, gc, badge'

export const COLS_EQUIPO_MOV =
  'codtemporada, fecha, clase, direccion, intra_temporada, codjugador, nombre, ' +
  'equipo_rel_cod, equipo_rel_nombre, equipo_rel_escudo, convocatorias, frontera'

export const COLS_EQUIPO_HITOS = 'tipo_hito, fecha, codtemporada, detalle, valor'

export const COLS_PLANTILLA_JUVENIL =
  'codjugador, codtemporada, nombre, dorsal_comun, posicion_pastilla, pj, goles, minutos, ta, td, tr'

// --- Tipos (parciales) ---
export type EquipoFicha = {
  codequipo: string
  nombre: string
  escudo: string | null
  club_root: string | null
  rama: string | null
  categoria_nivel: number | null
  nombre_comp: string | null
  codgrupo: string | null
  grupo_nombre: string | null
  codtemporada: string | null
  activo: boolean | null
  posicion_actual: number | null
  elo_actual: number | null
  elo_max: number | null
  temporada_elo_max: string | null
  elo_serie: { t: string; elo: number }[] | null
  posicion_juego_limpio: number | null
  ta_total: number | null
  tr_total: number | null
  td_total: number | null
  n_campeonatos: number | null
  n_ascensos: number | null
  n_descensos: number | null
  n_playoffs: number | null
  pj_total: number | null
  gf_total: number | null
  gc_total: number | null
  temporadas: number | null
}

export type MovimientoRow = {
  codtemporada: string | null
  fecha: string | null
  clase: string | null           // FICHAJE | PROMOCION_INTERNA
  direccion: string | null       // entra | sale
  intra_temporada: boolean | null
  codjugador: string | null
  nombre: string | null
  equipo_rel_cod: string | null
  equipo_rel_nombre: string | null
  equipo_rel_escudo: string | null
  convocatorias: number | null
  frontera: boolean | null
}

// Badge de temporada -> pastilla de color. Mapa ESTÁTICO con clases literales (src/lib está en el
// content de Tailwind, así que no se purgan).
export const BADGE: Record<string, { label: string; cls: string }> = {
  CAMPEON:  { label: 'Campeón',  cls: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/40' },
  ASCENSO:  { label: 'Ascenso',  cls: 'bg-grass-500/15 text-grass-300 ring-1 ring-inset ring-grass-400/40' },
  DESCENSO: { label: 'Descenso', cls: 'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/40' },
  PLAYOFF:  { label: 'Playoff',  cls: 'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/40' },
}

// Config de presentación de hitos de club: icono Lucide + etiqueta.
export const HITO_EQUIPO: Record<string, { icon: string; label: (h: { valor: number | null; detalle: string | null }) => string }> = {
  mejor_temporada:     { icon: 'Trophy',        label: (h) => `Mejor temporada${h.detalle ? ` · ${h.detalle}` : ''}` },
  mejor_racha:         { icon: 'Flame',         label: (h) => h.detalle || 'Mejor racha' },
  mayor_goleada:       { icon: 'Swords',        label: (h) => `Mayor goleada${h.detalle ? ` · ${h.detalle}` : ''}` },
  partidos_acumulados: { icon: 'CalendarCheck', label: (h) => `${h.valor} partidos en la categoría` },
}

// Fechas: los hitos usan DD/MM/YYYY (o null); los movimientos usan YYYYMMDD.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function fechaCortaDMY(fecha: string | null): string {
  if (!fecha) return ''
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return fecha
  return `${parseInt(m[1], 10)} ${MESES[parseInt(m[2], 10) - 1] ?? m[2]} ${m[3]}`
}
export function fechaCortaYMD(fecha: string | null): string {
  if (!fecha) return ''
  const m = fecha.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (!m) return fecha
  return `${parseInt(m[3], 10)} ${MESES[parseInt(m[2], 10) - 1] ?? m[2]} ${m[1]}`
}
