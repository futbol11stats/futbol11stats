import { unstable_cache } from 'next/cache'

// TTL igual al ISR de ruta (30 días): con etiquetas la invalidación es explícita (endpoint /api/revalidate),
// y el tiempo largo es solo el fallback por si alguna lectura quedara sin etiquetar.
const TTL = 2592000

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

// Lectura de los ÍNDICES (home + categorías): dependen de agregados de web_grupos, no de una entidad.
export function cacheIndices<T>(fn: () => Promise<T>, keyParts: Array<string | number>): Promise<T> {
  return cacheTagged(fn, keyParts, ['indices'])
}
