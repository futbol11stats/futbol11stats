import { NextResponse, type NextRequest } from 'next/server'

// Middleware ACOTADO A PROPÓSITO a /madrid/jugador/* (ver `config.matcher`): no queremos una capa corriendo en
// todas las peticiones del sitio. Dos ramas, ambas leen una tabla diminuta del pipeline cacheada por isolate con
// TTL corto (NUNCA una consulta por request) y ambas FAIL-OPEN (ante error se sigue el flujo normal, nunca se
// inventa un corte). Precedencia: SUPRIMIDOS (410) primero, luego ALIAS (301) — un código no debería estar en
// ambos, pero si lo estuviera, la baja permanente (410) manda.
//
// 1) DERECHO AL OLVIDO — 410 Gone (web_suprimidos). Google trata 410 como baja permanente y desindexa antes que
//    un 404. Corta ANTES de renderizar, así que el 410 va aunque web_jugador aún tenga la fila.
// 2) FUSIÓN DE DUPLICADOS — 301 (web_jugador_alias). Al fusionar, el canon es el código que la RFFM usa AHORA;
//    el código viejo (con ficha indexada) se vuelve ghost y desaparece de web_jugador en el re-export → su URL
//    moriría en 404. En su lugar, 301 permanente al canónico vigente (que preserva el posicionamiento).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const TTL_MS = 60_000   // refresco por isolate; un cambio nuevo tarda <=60s en aplicarse (el 404 cubre el hueco)

// Lector genérico cacheado por isolate. FAIL-OPEN: ante error de red/BD reusa el último valor conocido (o el
// vacío inicial) y nunca inventa un corte — mejor servir la ficha que retirarla/redirigirla por error.
function lectorCacheado<T>(url: string, parse: (rows: any[]) => T, vacio: () => T) {
  let cache: { val: T; ts: number } | null = null
  return async (): Promise<T> => {
    const now = Date.now()
    if (cache && now - cache.ts < TTL_MS) return cache.val
    if (!SUPABASE_URL || !SUPABASE_KEY) return cache?.val ?? vacio()
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${url}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`${url} HTTP ${res.status}`)
      const val = parse((await res.json()) as any[])
      cache = { val, ts: now }
      return val
    } catch {
      return cache?.val ?? vacio()
    }
  }
}

// Set de codjugadores SUPRIMIDOS (derecho al olvido).
const getSuprimidos = lectorCacheado<Set<string>>(
  'web_suprimidos?select=codjugador',
  (rows) => new Set(rows.map((r) => String(r.codjugador))),
  () => new Set(),
)

// Mapa alias→canónico de fusiones. La tabla trae las cadenas ya resueltas al terminal (el canónico NUNCA es a su
// vez un alias), así que un solo lookup basta — no hay que seguir saltos.
const getAlias = lectorCacheado<Map<string, string>>(
  'web_jugador_alias?select=codjugador_alias,codjugador_canonico',
  (rows) => new Map(rows.map((r) => [String(r.codjugador_alias), String(r.codjugador_canonico)])),
  () => new Map(),
)

const PAGINA_410 = `<!doctype html><html lang="es"><head><meta charset="utf-8">`
  + `<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">`
  + `<title>Ficha retirada</title></head><body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.5">`
  + `<h1>Ficha retirada</h1><p>Esta ficha se ha eliminado de forma permanente y ya no está disponible.</p></body></html>`

export async function middleware(req: NextRequest) {
  // El slug es `${codjugador}-${nombre}` (o solo el código): el codjugador es el prefijo antes del primer "-".
  // codjugador es numérico (text sin guiones), así que el split es unívoco.
  const m = req.nextUrl.pathname.match(/^\/madrid\/jugador\/([^/]+)/)
  if (!m) return NextResponse.next()
  const cod = decodeURIComponent(m[1]).split('-')[0]
  if (!cod) return NextResponse.next()

  // 1) SUPRIMIDO → 410 Gone (precedencia sobre el alias).
  const suprimidos = await getSuprimidos()
  if (suprimidos.has(cod)) {
    return new NextResponse(PAGINA_410, { status: 410, headers: { 'content-type': 'text/html; charset=utf-8' } })
  }

  // 2) ALIAS (ghost de fusión) → 301 al canónico. Redirige al CÓDIGO canónico pelado (`/madrid/jugador/<canon>`)
  //    conservando cualquier subruta/consulta; la página resuelve por código y hace su 308 al slug canónico con
  //    nombre. No metemos el nombre aquí (la tabla no lo trae) -> encadena un 2º salto permanente, inocuo para SEO.
  const alias = await getAlias()
  const canonico = alias.get(cod)
  if (canonico) {
    const url = req.nextUrl.clone()
    const parts = url.pathname.split('/')   // ['', 'madrid', 'jugador', '<slug>', ...resto]
    parts[3] = canonico
    url.pathname = parts.join('/')
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

// ESTRICTAMENTE acotado: el middleware solo se invoca para las rutas de ficha de jugador (base y sub-rutas:
// temporada, v2…). El resto del sitio no pasa por esta capa.
export const config = { matcher: '/madrid/jugador/:path*' }
