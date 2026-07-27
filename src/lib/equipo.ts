// Utilidades de la FICHA DE EQUIPO. Reutiliza helpers genéricos de la ficha de jugador
// (slugify, codFromSlug, tempLabel, fechaISO) y la etiqueta de temporada. El escudo se lee directo
// de las filas (nombre de fichero del bucket, como el resto del sitio) — igual que en la ficha de jugador.

import { supabase } from '@/lib/supabase'
import { slugify, codFromSlug, tempLabel, LIVE_COD } from '@/lib/jugador'

export { slugify, codFromSlug, tempLabel, LIVE_COD }

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

// Ficha mínima de un jugador para los movimientos (existencia + nombre canónico + posición).
export type FichaMov = { nombre: string; pos: string | null; estimada: boolean }

// Info de un grupo (por codgrupo) para construir el enlace a su vista. Reutilizable por la ficha de
// jugador (pastilla de competición del hero) y donde haga falta resolver un grupo desde su código.
export async function getGrupoInfo(codgrupo: string | null | undefined) {
  if (!codgrupo) return null
  const { data } = await supabase.from('web_grupos')
    .select('slug_comp, slug_grupo, jornada_actual, categoria, tipo, nombre_comp, grupo_nombre, codtemporada')
    .eq('codgrupo', codgrupo).limit(1).maybeSingle()
  return data as Record<string, any> | null
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

// Forma REAL de cada entrada en el JSONB (por ahora solo T21).
type CopaRaw = {
  codtemporada: string
  competicion: string
  codgrupo: string
  slug_comp: string
  estado_label: string | null
}

// Lo que consume CopasLinea (nombre completo -> sello + nombre corto; estado; enlace).
export type CopaEquipo = {
  nombre_comp: string
  estado: string | null
  href: string | null
}

export async function getCopasEquipo(codequipo: string | number | null | undefined): Promise<CopaEquipo[]> {
  if (!COPAS_HABILITADO || codequipo == null) return []
  const { data, error } = await supabase.from('web_equipo').select('copas').eq('codequipo', String(codequipo)).limit(1).maybeSingle()
  if (error || !data) return []
  const raw = (data as { copas?: unknown }).copas
  if (!Array.isArray(raw)) return []
  // Solo temporada en curso.
  const copasT = (raw as CopaRaw[]).filter((c) => String(c.codtemporada) === LIVE_COD)
  if (copasT.length === 0) return []
  // Resolver slug_grupo/jornada/categoria por codgrupo para el href de la vista de copa (entrada 'resultados').
  const cods = Array.from(new Set(copasT.map((c) => String(c.codgrupo))))
  const { data: grupos } = await supabase.from('web_grupos')
    .select('codgrupo, slug_grupo, jornada_actual, categoria').in('codgrupo', cods)
  const gmap = new Map((grupos || []).map((g: any) => [String(g.codgrupo), g]))
  return copasT.map((c) => {
    const g = gmap.get(String(c.codgrupo))
    const rama = g && String(g.categoria).toUpperCase() === 'JUVENIL' ? 'juveniles' : 'aficionados'
    const href = g
      ? `/madrid/${rama}/${c.slug_comp}/${g.slug_grupo}/${tempLabel(c.codtemporada)}/jornada-${g.jornada_actual || 1}/resultados`
      : null
    return { nombre_comp: c.competicion, estado: c.estado_label, href }
  })
}

// Columnas explícitas de los fetchers (cotejadas con el DDL de _equipos_export.py).
export const COLS_EQUIPO =
  'codequipo, nombre, escudo, club_root, rama, categoria_nivel, nombre_comp, codgrupo, grupo_nombre, ' +
  'codtemporada, activo, posicion_actual, elo_actual, elo_max, temporada_elo_max, elo_serie, ' +
  'posicion_juego_limpio, ta_total, tr_total, n_campeonatos, n_ascensos, n_descensos, n_playoffs, ' +
  'pj_total, gf_total, gc_total, temporadas'

export const COLS_EQUIPO_TEMPORADAS =
  'codtemporada, nombre_comp, categoria_nivel, rama, codgrupo, grupo_nombre, pj, pts, posicion_final, gf, gc, badge'

export const COLS_EQUIPO_MOV =
  'codtemporada, fecha, clase, direccion, intra_temporada, codjugador, nombre, ' +
  'equipo_rel_cod, equipo_rel_nombre, equipo_rel_escudo, convocatorias, frontera'

export const COLS_EQUIPO_HITOS = 'tipo_hito, fecha, codtemporada, detalle, valor'

export const COLS_PLANTILLA_JUVENIL =
  'codjugador, codtemporada, nombre, dorsal_comun, posicion_pastilla, pj, goles, minutos, ta, tr'

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
