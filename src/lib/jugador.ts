// Utilidades de la FICHA DE JUGADOR: slug canónico, resolución de qué códigos tienen ficha
// (para el enlazado condicional en las tablas del sitio), columnas explícitas de los 4 fetchers
// y configuración de presentación de hitos. El formateo de nombre vive en @/lib/supabase
// (formatNombre) y se re-exporta aquí por comodidad.

import { supabase } from '@/lib/supabase'
import { formatNombre } from '@/lib/supabase'

export { formatNombre }

// codtemporada (TEXT en las tablas de jugador) -> etiqueta de temporada.
export const TEMP_LABEL: Record<string, string> = {
  '17': '2021-22',
  '18': '2022-23',
  '19': '2023-24',
  '20': '2024-25',
  '21': '2025-26',
}
export const LIVE_COD = '21'                 // temporada viva (codtemporada como TEXT)
export const PRIMERA_TEMP = '2021-22'        // inicio de la ventana de datos (no-cohorte)

export function tempLabel(cod: string | number | null): string {
  if (cod == null) return ''
  return TEMP_LABEL[String(cod)] ?? String(cod)
}

// Slug de URL: minúsculas, sin tildes, no-alfanumérico -> guion, colapsado y recortado.
export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quita diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Slug canónico de una ficha: {codjugador}-{nombre-slugificado} (nombre ya en "Nombre Apellidos").
export function jugadorSlug(codjugador: string | number, nombre: string | null): string {
  const suf = slugify(formatNombre(nombre))
  return suf ? `${codjugador}-${suf}` : String(codjugador)
}

// URL relativa de la ficha (para <Link>).
export function jugadorHref(codjugador: string | number, nombre: string | null): string {
  return `/madrid/jugador/${jugadorSlug(codjugador, nombre)}`
}

// El prefijo numérico del slug es el codjugador (la página resuelve por él; el sufijo es cosmético).
export function codFromSlug(slug: string): string {
  const m = slug.match(/^(\d+)/)
  return m ? m[1] : ''
}

// ENLAZADO CONDICIONAL: de un conjunto de codjugadores, cuáles tienen ficha en web_jugador.
// Query barata (SELECT codjugador ... WHERE codjugador IN (...)). Se llama SOLO en la rama
// aficionados; en juveniles ni se invoca (esos códigos no están en web_jugador). Devuelve un Set.
export async function fichasExistentes(codjugadores: (string | number | null | undefined)[]): Promise<Set<string>> {
  const ids = Array.from(new Set(codjugadores.filter(Boolean).map(String)))
  if (ids.length === 0) return new Set()
  const { data } = await supabase.from('web_jugador').select('codjugador').in('codjugador', ids)
  return new Set((data || []).map((r) => String(r.codjugador)))
}

// Columnas explícitas de los 4 fetchers de la ficha (evita SELECT *; cotejadas con el DDL del pipeline).
export const COLS_JUGADOR =
  'codjugador, nombre, anio_nacimiento, edad, posicion_federativa, posicion_pastilla, posicion_es_estimada, ' +
  'codequipo_actual, equipo_actual_nombre, escudo_actual, codtemporada_ultima, elo_actual, elo_percentil, ' +
  'elo_max, temporada_elo_max, elo_serie, categoria_rama, categoria_nivel, rating_f11s, rating_f11s_fuente, ' +
  'trayectoria_completa, pj_total, goles_total, minutos_total, temporadas, titular_total, suplente_total, ' +
  'dorsal_ultimo, dorsal_comun, dorsales_otros, rank_general, rank_general_total, rank_categoria, ' +
  'rank_categoria_total, rank_posicion, rank_posicion_total, es_portero, goles_encajados_total, ' +
  'porterias_cero_total, gc_pj'

export const COLS_CARRERA =
  'codtemporada, codequipo, equipo_nombre, escudo, nombre_comp, categoria_rama, categoria_nivel, codgrupo, ' +
  'grupo_nombre, pj, goles, minutos, pts_fantasy, media_fantasy, elo_final, titular, suplente, ' +
  'tarjetas_amarillas, tarjetas_rojas, goles_encajados, porterias_cero'

export const COLS_HITOS =
  'tipo_hito, ambito, fecha, codacta, codtemporada, contexto_cod, contexto_nombre, escudo, ' +
  'categoria_rama, categoria_nivel, detalle, valor'

export const COLS_ACTUACIONES =
  'rank, codacta, fecha, codtemporada, codequipo, equipo_nombre, escudo, rival_cod, rival_nombre, ' +
  'rival_escudo, resultado, goles, pts'

// --- Tipos (parciales, solo lo que consume la ficha) ---
export type JugadorFicha = {
  codjugador: string
  nombre: string
  anio_nacimiento: number | null
  edad: number | null
  posicion_federativa: string | null
  posicion_pastilla: string | null
  posicion_es_estimada: boolean | null
  codequipo_actual: string | null
  equipo_actual_nombre: string | null
  escudo_actual: string | null
  codtemporada_ultima: string | null
  elo_actual: number | null
  elo_percentil: number | null
  elo_max: number | null
  temporada_elo_max: string | null
  elo_serie: { t: string; elo: number }[] | null
  categoria_rama: string | null
  categoria_nivel: number | null
  rating_f11s: number | null
  rating_f11s_fuente: string | null
  trayectoria_completa: boolean | null
  pj_total: number | null
  goles_total: number | null
  minutos_total: number | null
  temporadas: number | null
  titular_total: number | null
  suplente_total: number | null
  dorsal_ultimo: number | null
  dorsal_comun: number | null
  dorsales_otros: number[] | null
  rank_general: number | null
  rank_general_total: number | null
  rank_categoria: number | null
  rank_categoria_total: number | null
  rank_posicion: number | null
  rank_posicion_total: number | null
  es_portero: boolean | null
  goles_encajados_total: number | null
  porterias_cero_total: number | null
  gc_pj: number | null
}

export type HitoRow = {
  tipo_hito: string
  ambito: string
  fecha: string
  codacta: string | null
  codtemporada: string | null
  contexto_cod: string | null
  contexto_nombre: string | null
  escudo: string | null
  categoria_rama: string | null
  categoria_nivel: number | null
  detalle: string | null
  valor: number | null
}

// Pastilla de posición: color por demarcación (spec v3). Guion gris si no hay posición.
export const POS_COLOR: Record<string, string> = {
  POR: 'bg-orange-500/15 text-orange-300 ring-1 ring-inset ring-orange-500/30',
  DEF: 'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/30',
  MED: 'bg-grass-500/20 text-grass-300 ring-1 ring-inset ring-grass-400/30',
  DEL: 'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30',
}
export const POS_LABEL: Record<string, string> = {
  POR: 'Portero', DEF: 'Defensa', MED: 'Centrocampista', DEL: 'Delantero',
}

// Series de hitos (acumulados): en la vista curada solo se muestra el último de cada serie.
export const SERIE_TIPOS = new Set(['partidos_acumulados', 'goles_acumulados', 'porterias_cero_acumuladas'])

// Config de presentación de cada tipo de hito: icono Lucide (nombre) + etiqueta.
export const HITO_CONFIG: Record<string, { icon: string; label: (h: HitoRow) => string }> = {
  debut:                     { icon: 'Flag',          label: () => 'Debut' },
  primer_partido_registrado: { icon: 'Flag',          label: () => 'Primer partido registrado' },
  primer_gol:                { icon: 'Goal',          label: () => 'Primer gol' },
  primer_gol_registrado:     { icon: 'Goal',          label: () => 'Primer gol registrado' },
  primer_hat_trick:          { icon: 'Flame',         label: () => 'Primer hat-trick' },
  partidos_acumulados:       { icon: 'CalendarCheck', label: (h) => `${h.valor} partidos` },
  goles_acumulados:          { icon: 'Target',        label: (h) => `${h.valor} goles` },
  primera_porteria_cero:     { icon: 'ShieldCheck',   label: () => 'Primera portería a cero' },
  porterias_cero_acumuladas: { icon: 'Shield',        label: (h) => `${h.valor} porterías a cero` },
  temporada_completa:        { icon: 'CircleCheckBig',label: () => 'Temporada completa' },
}

// DD/MM/YYYY -> clave ISO ordenable (YYYYMMDD) para cronología (mismo bug ya corregido en el pipeline).
export function fechaISO(fecha: string | null): string {
  if (!fecha) return '00000000'
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}${m[2]}${m[1]}` : '00000000'
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// DD/MM/YYYY -> "17 nov 2021"
export function fechaCorta(fecha: string | null): string {
  if (!fecha) return ''
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return fecha
  const dia = parseInt(m[1], 10)
  const mes = MESES[parseInt(m[2], 10) - 1] ?? m[2]
  return `${dia} ${mes} ${m[3]}`
}

// Selecciona los hitos "curados" (los de serie colapsan al último cronológico de cada serie;
// el resto se muestran todos). Devuelve { curados, total } — ambos ya ordenados cronológicamente.
export function curarHitos(hitos: HitoRow[]): { curados: HitoRow[]; todos: HitoRow[] } {
  const orden = [...hitos].sort((a, b) => fechaISO(a.fecha).localeCompare(fechaISO(b.fecha)))
  // Para cada serie (tipo_hito de serie) me quedo con el más reciente (último cronológico).
  const ultimoSerie = new Map<string, HitoRow>()
  for (const h of orden) {
    if (SERIE_TIPOS.has(h.tipo_hito)) ultimoSerie.set(h.tipo_hito, h)  // el último gana (orden asc)
  }
  const curados = orden.filter((h) => {
    if (!SERIE_TIPOS.has(h.tipo_hito)) return true
    return ultimoSerie.get(h.tipo_hito) === h
  })
  return { curados, todos: orden }
}
