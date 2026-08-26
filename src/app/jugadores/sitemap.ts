import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import { jugadorSlug } from '@/lib/jugador'
import { getLastmodMaps } from '@/lib/sitemapLastmod'

export const revalidate = 2592000 // ISR 30d: solo cambia al reexportar el catálogo de jugadores.

// Sitemap PROPIO de fichas de jugador (~38k URLs), particionado con generateSitemaps. Genera
// /jugadores/sitemap/[id].xml; robots.ts enumera cada partición con la MISMA fórmula de nº de
// particiones -> numeración coherente índice<->rutas.
//
// Robustez (Search Console cazó particiones 404 y otras vacías en silencio): NO se usa
// `count:'exact'` — devolvía un error vacío intermitente con la anon key en build/revalidación y
// dejaba el recuento en null (menos particiones de la cuenta). Todo va por KEYSET (codjugador + .gt,
// sin OFFSET/.range que también dejaba huecos), y cada partición FALLA EL BUILD si sale vacía. Un
// sitemap vacío en silencio es justo lo que hay que impedir.
export const JUGADORES_SITEMAP_CHUNK = 10000  // URLs por partición (límite Google: 50k/sitemap)
const PAGE = 1000                             // tope de filas por query en PostgREST

type Fila = { codjugador: string; nombre: string; codtemporada_ultima: number | string | null }

// Recuento por KEYSET (nada de count:'exact'). Falla ruidoso si una página da error.
export async function contarKeyset(tabla: string, key: string): Promise<number> {
  let total = 0
  let ultimo = ''
  for (;;) {
    let q = supabase.from(tabla).select(key).order(key, { ascending: true }).limit(PAGE)
    if (ultimo) q = q.gt(key, ultimo)
    const { data, error } = await q
    if (error) throw new Error(`[sitemap] fallo contando ${tabla} tras ${total} filas: ${error.message || 'error sin mensaje'}`)
    if (!data || data.length === 0) break
    total += data.length
    ultimo = String((data[data.length - 1] as any)[key])
    if (data.length < PAGE) break
  }
  return total
}

// TODAS las filas por KEYSET (order by codjugador + .gt del último visto), lotes de PAGE hasta agotar.
async function todasLasFilas(): Promise<Fila[]> {
  const filas: Fila[] = []
  let ultimo = ''
  for (;;) {
    let q = supabase.from('web_jugador').select('codjugador, nombre, codtemporada_ultima').order('codjugador', { ascending: true }).limit(PAGE)
    if (ultimo) q = q.gt('codjugador', ultimo)
    const { data, error } = await q
    if (error) throw new Error(`[sitemap jugadores] fallo paginando web_jugador tras ${filas.length} filas: ${error.message || 'error sin mensaje'}`)
    if (!data || data.length === 0) break
    filas.push(...(data as Fila[]))
    ultimo = (data[data.length - 1] as Fila).codjugador
    if (data.length < PAGE) break
  }
  return filas
}

export async function generateSitemaps() {
  const total = await contarKeyset('web_jugador', 'codjugador')
  if (total === 0) throw new Error('[sitemap jugadores] web_jugador devolvió 0 filas al particionar')
  const n = Math.max(1, Math.ceil(total / JUGADORES_SITEMAP_CHUNK))
  return Array.from({ length: n }, (_, i) => ({ id: i }))
}

export default async function sitemap({ id }: { id: Promise<number> | number }): Promise<MetadataRoute.Sitemap> {
  // Next 16 pasa `id` como Promise; se resuelve antes de calcular la partición.
  const idNum = Number(await id) || 0
  const filas = await todasLasFilas()   // keyset completo (o lanza); su longitud ES el recuento fiable.
  const total = filas.length
  if (total === 0) throw new Error(`[sitemap jugadores] partición ${idNum}: web_jugador devolvió 0 filas`)

  const n = Math.max(1, Math.ceil(total / JUGADORES_SITEMAP_CHUNK))
  const inicio = idNum * JUGADORES_SITEMAP_CHUNK
  const trozo = filas.slice(inicio, inicio + JUGADORES_SITEMAP_CHUNK)

  // GUARD ruidoso: una partición anunciada (id < n) jamás debe salir vacía (síntoma exacto de GSC).
  if (trozo.length === 0 && idNum < n) {
    throw new Error(`[sitemap jugadores] partición ${idNum} vacía (de ${n}; total ${total})`)
  }

  const { porTemporada } = await getLastmodMaps()
  return trozo.map((j) => ({
    url: `${SITE_URL}/madrid/jugador/${jugadorSlug(j.codjugador, j.nombre)}`,
    lastModified: porTemporada.get(Number(j.codtemporada_ultima)),   // último partido de su última temporada
    changeFrequency: 'monthly',
    priority: 0.5,
  }))
}
