// PostgREST corta CADA respuesta a 1.000 filas (max-rows del proyecto) SIN error: una lectura que pase de ahí
// vuelve truncada y en silencio. Medido 2026-11-02: la vista global de 2ª Aficionados T22 veía 173 de 344
// equipos y un goleador líder con 11 goles cuando el real tenía 14.
export const MAX_FILAS = 1000

// Lectura COMPLETA paginada con orden ÚNICO por id (sin orden, Postgres no garantiza el mismo orden entre
// páginas y range() repetiría u omitiría filas). `build` crea la consulta de cero en cada página (los
// builders de supabase-js acumulan filtros). Para lo que de verdad puede pasar de 1.000; lo demás, pedir menos.
export async function todasLasFilas<T>(build: () => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += MAX_FILAS) {
    const { data, error } = await build().order('id').range(from, from + MAX_FILAS - 1)
    if (error) throw error
    const filas = (data || []) as T[]
    out.push(...filas)
    if (filas.length < MAX_FILAS) return out
  }
}
