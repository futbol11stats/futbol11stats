// Buscador: consultas directas a Supabase (anon) + normalización + ranking.
// NOTA: el pipeline está creando `nombre_busqueda` (normalizado) + índices trigram. Mientras no
// exista, se busca contra `nombre` con normalización en cliente. Para cambiar a `nombre_busqueda`
// basta poner USA_NOMBRE_BUSQUEDA=true (los tokens pasan a ir sin acentos, como la columna).

import { supabase } from '@/lib/supabase'

// ---- Columna normalizada del pipeline (nombre_busqueda) ya disponible + índices trigram. ----
export const USA_NOMBRE_BUSQUEDA = true
const COL_JUG = USA_NOMBRE_BUSQUEDA ? 'nombre_busqueda' : 'nombre'
const COL_EQ = USA_NOMBRE_BUSQUEDA ? 'nombre_busqueda' : 'nombre'

// El badge activo/inactivo del buscador recibe el suelo vivo por prop (getSueloVivo, resuelto en el layout
// server). Ya no hay constante de temporada aquí. Ver '@/lib/temporadas'.

// Normalización COMPLETA (como el pipeline): mayúsculas, sin acentos, sin puntuación, colapsada.
// Se usa para prefijo/ranking y para generar tokens contra la columna normalizada.
export function normFull(s: string | null): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Normalización que CONSERVA la longitud (solo mayúsculas + quita acentos): para resaltar sobre el
// texto de display sin desalinear posiciones.
export function normAlign(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
}

// Tokens para el ILIKE. Contra `nombre_busqueda` van sin acentos (la columna ya lo está); contra
// `nombre` se conservan los acentos (el dato los tiene) — solo mayúsculas + quita puntuación.
export function queryTokens(q: string): string[] {
  // Contra `nombre` conservamos letras acentuadas (rango Latin-1 en mayúsculas À-Þ) y dígitos.
  const base = USA_NOMBRE_BUSQUEDA
    ? normFull(q)
    : q.toUpperCase().replace(/[^A-ZÀ-Þ0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  return base.split(' ').filter(Boolean)
}

// Tokens para RESALTAR (siempre sin acentos, coincidencia insensible a tildes sobre el display).
export function highlightTokens(q: string): string[] {
  return normFull(q).split(' ').filter(Boolean)
}

export type JugadorHit = {
  codjugador: string
  nombre: string
  escudo_actual: string | null
  posicion_pastilla: string | null
  posicion_es_estimada: boolean | null
  pj_total: number | null
  equipo_actual_nombre: string | null
  codtemporada_ultima: string | null
}
export type EquipoHit = {
  codequipo: string
  nombre: string
  escudo: string | null
  rama: string | null
  nombre_comp: string | null
  grupo_nombre: string | null
  codtemporada: string | null
  activo: boolean | null
  pj_total: number | null
}

export type ClubHit = {
  codclub: string
  nombre_club: string
  escudo: string | null
  localidad: string | null
  provincia: string | null
  n_equipos: number | null
}

const COLS_J = 'codjugador, nombre, escudo_actual, posicion_pastilla, posicion_es_estimada, pj_total, equipo_actual_nombre, codtemporada_ultima'
const COLS_E = 'codequipo, nombre, escudo, rama, nombre_comp, grupo_nombre, codtemporada, activo, pj_total'
const COLS_C = 'codclub, nombre_club, escudo, localidad, provincia, n_equipos'

// Prefijo primero (nombre normalizado empieza por la query), conservando el orden previo (pj_total).
function rankPrefijo<T extends { nombre: string }>(rows: T[], q: string): T[] {
  const nq = normFull(q)
  const pre: T[] = [], resto: T[] = []
  for (const r of rows) (normFull(r.nombre).startsWith(nq) ? pre : resto).push(r)
  return [...pre, ...resto]
}

export async function buscarJugadores(q: string, limit: number, offset = 0): Promise<{ rows: JugadorHit[]; count: number }> {
  const toks = queryTokens(q)
  if (normFull(q).length < 2 || toks.length === 0) return { rows: [], count: 0 }
  let query = supabase.from('web_jugador').select(COLS_J, { count: 'exact' })
  for (const t of toks) query = query.ilike(COL_JUG, `%${t}%`)
  // Titular histórico sobre el tocayo de un partido: pj_total DESC.
  const { data, count } = await query.order('pj_total', { ascending: false, nullsFirst: false }).range(offset, offset + limit - 1)
  return { rows: rankPrefijo((data || []) as unknown as JugadorHit[], q), count: count || 0 }
}

export async function buscarEquipos(q: string, limit: number, offset = 0): Promise<{ rows: EquipoHit[]; count: number }> {
  const toks = queryTokens(q)
  if (normFull(q).length < 2 || toks.length === 0) return { rows: [], count: 0 }
  let query = supabase.from('web_equipo').select(COLS_E, { count: 'exact' })
  for (const t of toks) query = query.ilike(COL_EQ, `%${t}%`)
  const { data, count } = await query.order('pj_total', { ascending: false, nullsFirst: false }).range(offset, offset + limit - 1)
  return { rows: rankPrefijo((data || []) as unknown as EquipoHit[], q), count: count || 0 }
}

// Clubes: se busca contra `nombre_club` (mayúsculas sin acentos, como jugador/equipo -> los tokens normalizados
// casan). `.gt('n_equipos', 0)` deja fuera los clubes sin equipos (sin página). Prefijo primero por nombre.
export async function buscarClubes(q: string, limit: number, offset = 0): Promise<{ rows: ClubHit[]; count: number }> {
  const toks = queryTokens(q)
  if (normFull(q).length < 2 || toks.length === 0) return { rows: [], count: 0 }
  let query = supabase.from('web_club').select(COLS_C, { count: 'exact' }).gt('n_equipos', 0)
  for (const t of toks) query = query.ilike('nombre_club', `%${t}%`)
  const { data, count } = await query.order('n_equipos', { ascending: false, nullsFirst: false }).range(offset, offset + limit - 1)
  const rows = (data || []) as unknown as ClubHit[]
  const nq = normFull(q)
  rows.sort((a, b) => Number(normFull(b.nombre_club || '').startsWith(nq)) - Number(normFull(a.nombre_club || '').startsWith(nq)))
  return { rows, count: count || 0 }
}
