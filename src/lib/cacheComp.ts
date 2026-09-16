import { unstable_cache } from 'next/cache'

// TTL igual al ISR de ruta (30 días): con etiquetas la invalidación es explícita (endpoint /api/revalidate),
// y el tiempo largo es solo el fallback por si alguna lectura quedara sin etiquetar.
const TTL = 2592000

// Hash corto y estable (djb2) de la CADENA DE COLUMNAS de un select, para meterlo en keyParts y DERIVAR la
// versión de caché del propio select: cualquier alta/baja de columna cambia el hash -> cache-miss automático,
// sin bump a mano. Mata la familia recurrente "añadí una columna y olvidé bumpear la clave" (getCarreraV2,
// flag jugado, fecha_fin). Determinista y sin dependencias (funciona en cualquier runtime). NO cubre cambios
// de lógica POST-fetch (esos van en un segmento de versión aparte, p.ej. 'v1', que se bumpea a mano).
export function hashCols(cols: string): string {
  let h = 5381
  for (let i = 0; i < cols.length; i++) h = ((h << 5) + h + cols.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

// Envuelve una lectura de competición en unstable_cache con etiquetas por grupo + temporada, para que el
// endpoint /api/revalidate pueda invalidarla con revalidateTag('comp:<codgrupo>') / ('temporada:<cod>').
//   - keyParts: identifica la entrada de forma única (nombre de la función + sus argumentos).
//   - codgrupos: grupos de los que depende la lectura. UNO para la ficha de grupo; VARIOS para el global,
//     de modo que el global cuelga de comp:<codgrupo> de CADA grupo miembro (invalidar un grupo lo refresca).
//   - codtemporada: añade la etiqueta temporada:<cod> (escotilla para recalculos masivos por temporada).
export function cacheComp<T>(
  fn: () => Promise<T>,
  keyParts: Array<string | number>,
  codgrupos: Array<string | number>,
  codtemporada: number | string,
): Promise<T> {
  const tags = [...codgrupos.map((g) => `comp:${g}`), `temporada:${codtemporada}`]
  return unstable_cache(fn, keyParts.map(String), { tags, revalidate: TTL })()
}

// Genérico: envuelve una lectura con las etiquetas explícitas dadas (mismo TTL). Base de los helpers.
export function cacheTagged<T>(fn: () => Promise<T>, keyParts: Array<string | number>, tags: string[]): Promise<T> {
  return unstable_cache(fn, keyParts.map(String), { tags, revalidate: TTL })()
}

// Lectura de la ficha de EQUIPO. Etiqueta siempre `equipo:<codequipo>` (invalidar el equipo refresca sus 3
// variantes: base, /v2, /[temporada]/v2). Opcionalmente cuelga también de `comp:<codgrupo>` (lecturas
// grupo-scoped como la mini-clasificación o la serie de liga: se refrescan al actualizar ese grupo) y/o de
// `temporada:<cod>` (lecturas de una temporada concreta).
export function cacheEquipo<T>(
  fn: () => Promise<T>,
  keyParts: Array<string | number>,
  codequipo: string | number,
  opts?: { codgrupo?: string | number | null; codtemporada?: string | number | null },
): Promise<T> {
  const tags = [`equipo:${codequipo}`]
  if (opts?.codgrupo) tags.push(`comp:${opts.codgrupo}`)
  if (opts?.codtemporada != null) tags.push(`temporada:${opts.codtemporada}`)
  return cacheTagged(fn, keyParts, tags)
}

// Lectura de la ficha de JUGADOR. Etiqueta fina `jugador:<codjugador>` (invalidar el jugador refresca sus
// 3 variantes: base carrera, /v2, /[temporada]/v2). Opcional `temporada:<cod>` en lecturas de una temporada
// concreta. NO se cuelga de comp:<codgrupo> a propósito: la ficha es de carrera y un fichaje dejaría la
// etiqueta con el grupo antiguo → rancia. El pipeline invalida cada jugador tocado (ya conoce las
// alineaciones de las actas).
export function cacheJugador<T>(
  fn: () => Promise<T>,
  keyParts: Array<string | number>,
  codjugador: string | number,
  codtemporada?: string | number | null,
): Promise<T> {
  const tags = [`jugador:${codjugador}`]
  if (codtemporada != null) tags.push(`temporada:${codtemporada}`)
  return cacheTagged(fn, keyParts, tags)
}

// Lectura de la ficha de CLUB. Etiqueta `club:<codclub>` (formato club:4382), que el pipeline emite en el
// RE-EXPORT (no en el publish ligero) — p.ej. tras un rebrand de nombre, para que la ficha recalcule el nombre
// y su slug canónico. Mismo patrón de entidad que cacheEquipo/cacheJugador; NO se cuelga de 'indices' (es una
// ficha, no un índice: no debe barrerse en cada revalidación de la home/categorías).
export function cacheClub<T>(fn: () => Promise<T>, keyParts: Array<string | number>, codclub: string | number): Promise<T> {
  return cacheTagged(fn, keyParts, [`club:${codclub}`])
}

// Lectura de los ÍNDICES (home + categorías): dependen de agregados de web_grupos, no de una entidad.
export function cacheIndices<T>(fn: () => Promise<T>, keyParts: Array<string | number>): Promise<T> {
  return cacheTagged(fn, keyParts, ['indices'])
}
