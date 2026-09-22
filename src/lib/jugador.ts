// Utilidades de la FICHA DE JUGADOR: slug canónico, resolución de qué códigos tienen ficha
// (para el enlazado condicional en las tablas del sitio), columnas explícitas de los 4 fetchers
// y configuración de presentación de hitos. El formateo de nombre vive en @/lib/supabase
// (formatNombre) y se re-exporta aquí por comodidad.

import { supabase } from '@/lib/supabase'
import { formatNombre } from '@/lib/supabase'
import { codToSlug, TEMP_COD_BASE } from '@/lib/temporadaSlug'

export { formatNombre }

// La "temporada viva" ya NO es una constante: se resuelve data-driven por competición en '@/lib/temporadas'
// (vista web_temporada_activa + ventana). El badge activo/inactivo usa getSueloVivo(). Fuente única.
export const PRIMERA_TEMP = '2021-22'        // inicio de la ventana de datos (no-cohorte)

// codtemporada (TEXT en las tablas de jugador) -> etiqueta de temporada, vía codToSlug (fórmula lineal, fuente
// única en '@/lib/temporadaSlug'; sin lista topada -> T22 y siguientes solas). Cod fuera de rango o no numérico
// (defensivo) -> se muestra tal cual.
export function tempLabel(cod: string | number | null): string {
  if (cod == null) return ''
  const n = Number(cod)
  return Number.isInteger(n) && n >= TEMP_COD_BASE ? codToSlug(n) : String(cod)
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

// ENLAZADO POR EXISTENCIA + POSICIÓN (ambas ramas): de un conjunto de codjugadores, devuelve un Map
// codjugador -> { pos, estimada } para quien tiene ficha en web_jugador (mayor de edad garantizado
// HOY). La CLAVE presente = tiene ficha => se enlaza; ausente (menor) => texto plano. La posición
// alimenta la pastilla en las tablas (el asterisco de estimada solo lo tiene quien tiene ficha).
export type FichaInfo = { pos: string | null; estimada: boolean }
export async function fichasInfo(codjugadores: (string | number | null | undefined)[]): Promise<Map<string, FichaInfo>> {
  const ids = Array.from(new Set(codjugadores.filter(Boolean).map(String)))
  if (ids.length === 0) return new Map()
  const { data } = await supabase.from('web_jugador')
    .select('codjugador, posicion_pastilla, posicion_es_estimada').in('codjugador', ids)
  return new Map((data || []).map((r: any) => [String(r.codjugador), { pos: r.posicion_pastilla ?? null, estimada: !!r.posicion_es_estimada }]))
}

// Columnas explícitas de los 4 fetchers de la ficha (evita SELECT *; cotejadas con el DDL del pipeline).
// NO se leen los rank_* de web_jugador (rank_general/_total, rank_categoria/_total, rank_posicion/_total):
// el bloque Nivel pinta los de la TEMPORADA, que viven en web_jugador_carrera (rank_general_season,
// rank_sub23_season, rank_juvenil_season, rank_categoria_temp, rank_posicion_temp, fila rank_principal)
// y se rankean contra OTRO censo (los de la temporada, ~23,9k) distinto del histórico (~39,8k). No los
// vuelvas a añadir aquí pensando que alimentan RankFila: no lo hacen.
export const COLS_JUGADOR =
  'codjugador, nombre, anio_nacimiento, edad, posicion_federativa, posicion_pastilla, posicion_es_estimada, ' +
  'codequipo_actual, equipo_actual_nombre, escudo_actual, codtemporada_ultima, elo_actual, elo_percentil, ' +
  'elo_max, temporada_elo_max, elo_serie, categoria_rama, categoria_nivel, rating_f11s, rating_f11s_fuente, rating_serie, ' +
  'trayectoria_completa, pj_total, goles_total, minutos_total, temporadas, titular_total, suplente_total, ' +
  'dorsal_ultimo, dorsal_comun, dorsales_otros, es_portero, goles_encajados_total, ' +
  'porterias_cero_total, gc_pj, companeros_top'

export const COLS_CARRERA =
  'codtemporada, orden_temporada, codequipo, equipo_nombre, escudo, nombre_comp, categoria_rama, categoria_nivel, codgrupo, ' +
  'grupo_nombre, pj, goles, minutos, pts_fantasy, media_fantasy, elo_final, titular, suplente, ' +
  'tarjetas_amarillas, tarjetas_dobles, tarjetas_rojas, goles_encajados, porterias_cero, ' +
  'rank_general_temp, rank_general_temp_total, rank_categoria_temp, rank_categoria_temp_total, ' +
  'rank_posicion_temp, rank_posicion_temp_total, rank_principal, rank_general_season, rank_general_season_total, ' +
  'rank_sub23_season, rank_sub23_season_total, rank_juvenil_season, rank_juvenil_season_total, ' +
  'elo_percentil_temp, fecha_inicio, fecha_fin'

export const COLS_HITOS =
  'tipo_hito, ambito, fecha, codacta, codtemporada, contexto_cod, contexto_nombre, escudo, ' +
  'categoria_rama, categoria_nivel, detalle, valor, rival_cod, rival_nombre, rival_escudo, resultado'

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
  // PRIME (ver lib/prime.ts). OPCIONAL y AÚN NO EN COLS_JUGADOR a propósito: la columna elo_min no
  // existe todavía en web_jugador y pedirla en el select daría 400 en PostgREST -> getJugadorV2 null
  // -> fichas caídas. Cuando el pipeline la publique: añadirla a COLS_JUGADOR (hashCols invalida la
  // caché sola) y esto pasa a pintarse. elo_max ya está arriba y es de CARRERA, que es lo que toca.
  elo_min?: number | null
  temporada_elo_max: string | null
  elo_serie: { t: string; elo: number }[] | null
  categoria_rama: string | null
  categoria_nivel: number | null
  rating_f11s: number | null
  rating_f11s_fuente: string | null
  // Trayectoria del Rating F11S por temporada en 3ª RFEF (JSONB). Cada r es el PERCENTIL de ESA temporada
  // (0-100), NO una escala absoluta como el ELO. Puede faltar temporadas (no interpolar) y un solo punto vale.
  rating_serie: { t: string; r: number }[] | null
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
  es_portero: boolean | null
  goles_encajados_total: number | null
  porterias_cero_total: number | null
  gc_pj: number | null
  companeros_top: CompaneroTop[] | null
}

export type CompaneroTop = {
  codjugador: string
  nombre: string
  posicion_pastilla?: string | null
  posicion_es_estimada?: boolean | null
  escudo_actual: string | null
  equipo_actual: string | null
  // OPCIONAL A PROPÓSITO: el pipeline deja de exportar el ELO dentro del payload (era una copia
  // denormalizada de web_jugador.elo_actual que cambiaba cada noche y re-subía la ficha entera).
  // companerosActivos() lo lee de la fila del compañero y solo usa este como respaldo mientras
  // convivan los dos formatos de export.
  elo?: number | null
}

// "Ha jugado con": deja solo compañeros ACTIVOS en la temporada actual o la anterior (codtemporada_ultima
// >= actual-1); descarta a quien lleva dos o más temporadas inactivo. La temporada actual = el máximo
// codtemporada_ultima del sistema (codtemporada es TEXT de 2 dígitos "17".."21", así que el orden lexical
// coincide con el numérico). NOTA: web_jugador.companeros_top viene capado (~5-6) por el pipeline, así que
// tras filtrar puede quedar por debajo de 6 y NO hay pool para "coger el siguiente que cumpla"; para
// rellenar hasta 6 el pipeline tendría que exportar una lista más larga (idealmente con codtemporada_ultima).
//
// ELO Y ORDEN: el payload guarda el CONJUNTO en orden estable por codjugador, SIN el ELO. Quien ordena
// es esta función, con el elo_actual leído de la fila de cada compañero — en la consulta que esta función
// YA hacía para filtrar por temporada, o sea sin consulta extra. Así companeros_top solo cambia cuando
// cambia el CONJUNTO, no cada noche que un compañero juega (era el 72% de las re-subidas de fichas).
// Mientras convivan los dos formatos de export se cae al elo del payload si la fila no lo trae.
export async function companerosActivos(companeros: CompaneroTop[]): Promise<CompaneroTop[]> {
  if (!companeros.length) return []
  const ids = companeros.map((c) => c.codjugador)
  const [lastRes, maxRes] = await Promise.all([
    supabase.from('web_jugador').select('codjugador, codtemporada_ultima, elo_actual').in('codjugador', ids),
    supabase.from('web_jugador').select('codtemporada_ultima').order('codtemporada_ultima', { ascending: false }).limit(1),
  ])
  const filas = new Map<string, { ult: number; elo: number | null }>(
    ((lastRes.data || []) as any[]).map((r) => [
      String(r.codjugador),
      { ult: parseInt(r.codtemporada_ultima, 10), elo: r.elo_actual != null ? Number(r.elo_actual) : null },
    ]),
  )
  const actual = maxRes.data?.[0] ? parseInt((maxRes.data[0] as any).codtemporada_ultima, 10) : 0
  // ELO vivo de la fila; el del payload solo como respaldo (export antiguo / fila sin ELO).
  const conElo = companeros.map((c) => {
    const f = filas.get(String(c.codjugador))
    return { ...c, elo: f?.elo ?? c.elo ?? null }
  })
  // Sin ELO van al final; el desempate por codjugador mantiene el HTML estable entre regeneraciones ISR.
  const ordenados = conElo.sort((a, b) => {
    if (a.elo == null || b.elo == null) {
      if (a.elo != null) return -1
      if (b.elo != null) return 1
    } else if (a.elo !== b.elo) {
      return b.elo - a.elo
    }
    return a.codjugador.localeCompare(b.codjugador)
  })
  if (!actual) return ordenados // sin referencia de temporada -> no filtrar (mejor mostrar que ocultar)
  return ordenados.filter((c) => {
    const u = filas.get(String(c.codjugador))?.ult
    return u != null && u >= actual - 1
  })
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
  // Rival del hito (mayor_goleada…): campos propios del pipeline. Si rival_cod != null, detalle es null y la
  // frase se compone aquí ("vs {rival} {resultado}", rival por NombreEquipo+escudo). rival_nombre va CRUDO.
  rival_cod: string | null
  rival_nombre: string | null
  rival_escudo: string | null
  resultado: string | null
}

// Pastilla de posición: color por demarcación (spec v3). Guion gris si no hay posición.
export const POS_COLOR: Record<string, string> = {
  POR: 'bg-orange-500/15 text-orange-300 ring-1 ring-inset ring-orange-500/30',
  DEF: 'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/30',
  MED: 'bg-grass-500/20 text-grass-300 ring-1 ring-inset ring-grass-400/30',
  DEL: 'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30',
}
export const POS_LABEL: Record<string, string> = {
  POR: 'Portero', DEF: 'Defensa', MED: 'Medio', DEL: 'Delantero',
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

// resultado = "X-Y G/E/P" (ya en perspectiva del jugador): color por el sufijo.
// Fallback: si viene sin sufijo pero como marcador "X-Y" (p.ej. web_jugador_actuaciones,
// también en perspectiva del jugador), se deriva el signo comparando los goles.
export function parseResultado(resultado: string | null): { marcador: string; signo: string } {
  const m = (resultado || '').trim().match(/^(.*?)\s*([GEP])$/i)
  if (m) return { marcador: m[1].trim(), signo: m[2].toUpperCase() }
  const s = (resultado || '').trim().match(/^(\d+)\s*-\s*(\d+)$/)
  if (s) {
    const a = +s[1], b = +s[2]
    return { marcador: `${a}-${b}`, signo: a > b ? 'G' : a < b ? 'P' : 'E' }
  }
  return { marcador: resultado || '', signo: '' }
}
export const colorSigno = (s: string) => (s === 'G' ? 'text-grass-300' : s === 'P' ? 'text-red-300' : 'text-chalk-400')

// El resultado de web_jugador_partidos/_actuaciones viene en PERSPECTIVA del jugador (gf-gc). El
// marcador SIEMPRE se muestra en orden LOCAL-VISITANTE (regla única del sitio): si el jugador jugó
// FUERA (es_local=false) se voltea el par de goles. El COLOR no cambia -> sale del signo del dato,
// que sigue en perspectiva del jugador (verde victoria / gris empate / rojo derrota).
export function marcadorLocalVisitante(resultado: string | null, esLocal?: boolean | null): { marcador: string; signo: string } {
  const { marcador, signo } = parseResultado(resultado)
  if (esLocal === false) {
    const p = marcador.split('-')
    if (p.length === 2) return { marcador: `${p[1].trim()}-${p[0].trim()}`, signo }
  }
  return { marcador, signo }
}

// Goles del rival a partir del marcador "X-Y" (perspectiva del jugador = la Y). Para GC de portero
// en bloques que no traen goles_encajados (p.ej. web_jugador_actuaciones).
export function golesRival(resultado: string | null): number {
  const p = parseResultado(resultado).marcador.split('-')
  return p.length === 2 ? (parseInt(p[1], 10) || 0) : 0
}

// Valor con signo y color (para PTS de partido y Δ ELO): +N verde / −N rojo / 0 neutro.
export const signoCls = (n: number | null | undefined) =>
  (n == null ? 'text-chalk-600' : n > 0 ? 'text-grass-400' : n < 0 ? 'text-red-400' : 'text-chalk-600')
export const conSigno = (n: number | null | undefined) => (n == null ? '' : `${n > 0 ? '+' : ''}${Math.round(n)}`)

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

// Selecciona los hitos "curados" (los de serie colapsan al ÚLTIMO alcanzado de cada serie; el resto
// se muestran todos). Ambas listas se devuelven en orden CRONOLÓGICO INVERSO (lo más reciente arriba).
export function curarHitos(hitos: HitoRow[]): { curados: HitoRow[]; todos: HitoRow[] } {
  // Ascendente para elegir el último de cada serie (el hito más avanzado = el más reciente).
  const asc = [...hitos].sort((a, b) => fechaISO(a.fecha).localeCompare(fechaISO(b.fecha)))
  const ultimoSerie = new Map<string, HitoRow>()
  for (const h of asc) {
    if (SERIE_TIPOS.has(h.tipo_hito)) ultimoSerie.set(h.tipo_hito, h)  // el último gana (orden asc)
  }
  const curadosAsc = asc.filter((h) => {
    if (!SERIE_TIPOS.has(h.tipo_hito)) return true
    return ultimoSerie.get(h.tipo_hito) === h
  })
  // Reciente-arriba: invertimos para la presentación (el visible de cada serie sigue siendo el último).
  return { curados: [...curadosAsc].reverse(), todos: [...asc].reverse() }
}
