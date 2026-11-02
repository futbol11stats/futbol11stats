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

// GUARDA COMÚN contra el corte silencioso de PostgREST (max-rows = 1.000, sin error). Una lectura SIN paginar
// (sin limit/offset en la URL: ni .range() ni .limit()) que vuelve con exactamente 1.000 filas casi seguro que
// estaba cortada -> se convierte en ERROR en vez de devolver datos a medias. Se reconoce por la cabecera
// Content-Range "0-999/…" que PostgREST pone en toda respuesta. Solo GET a /rest/v1/ (HEAD de count no trae filas).
// OJO: supabase-js convierte cualquier fallo en { data: null, error }: quien lea `error` (sel(), `if (error)
// throw`) lanza; quien lo ignore recibe null -> vacío. Por eso además se deja rastro en el log con la ruta.
export const CODIGO_CORTE = 'F11S_CORTE_1000'
export async function fetchConGuarda(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if ((init?.method || 'GET').toUpperCase() !== 'GET' || !res.ok) return res
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (!url.pathname.includes('/rest/v1/') || url.searchParams.has('limit') || url.searchParams.has('offset')) return res
  if (!(res.headers.get('content-range') || '').startsWith(`0-${MAX_FILAS - 1}/`)) return res
  const donde = `${url.pathname.replace(/^.*\/rest\/v1\//, '')}?${url.searchParams.toString()}`.slice(0, 500)
  console.error(`[supabase] ${CODIGO_CORTE}: lectura sin paginar con ${MAX_FILAS} filas (corte de PostgREST): ${donde}`)
  await res.body?.cancel()
  return new Response(JSON.stringify({
    code: CODIGO_CORTE, details: donde, hint: 'Paginar con todasLasFilas (lib/paginar.ts) o pedir menos filas',
    message: `Lectura sin paginar con ${MAX_FILAS} filas: PostgREST la habría cortado en silencio`,
  }), { status: 422, headers: { 'content-type': 'application/json' } })
}
