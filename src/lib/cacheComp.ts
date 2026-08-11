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
