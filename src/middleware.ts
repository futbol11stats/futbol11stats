import { NextResponse, type NextRequest } from 'next/server'

// DERECHO AL OLVIDO — 410 Gone para fichas de jugador SUPRIMIDAS.
//
// Google trata 410 (Gone) como baja PERMANENTE y desindexa antes que un 404. La ficha ya da 404 cuando el
// jugador no existe (notFound() en page.tsx), pero un 404 no distingue "suprimido" de "nunca existió / slug
// mal escrito". Por eso la lápida vive en TABLA (web_suprimidos, owner = pipeline, poblada desde
// personas_excluidas('ficha') e 'todas'; NO las de rankings-only, que conservan ficha): la web sabe QUÉ código
// fue suprimido y devuelve 410 solo para esos. El middleware corta ANTES de renderizar, así que el 410 funciona
// aunque la fila de web_jugador aún no se haya borrado (el export la limpia después; aplicar_exclusion actualiza
// web_suprimidos en el acto).
//
// ACOTADO A PROPÓSITO a /madrid/jugador/* (ver `config.matcher`): no queremos una capa corriendo en todas las
// peticiones del sitio. Y NUNCA una consulta por request: la lista (diminuta, casos de derecho al olvido) se
// cachea en memoria del isolate con un TTL corto.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const TTL_MS = 60_000   // refresco por isolate; una supresión nueva tarda <=60s en dar 410 (el 404 cubre el hueco)
let cache: { set: Set<string>; ts: number } | null = null

// Set de codjugadores suprimidos, cacheado por isolate. FAIL-OPEN: ante error de red/BD se reusa el último set
// conocido (o vacío) y NUNCA se inventa un 410 -> mejor servir una ficha válida que retirar por error una que no
// lo está. Un suprimido que se colara por un fallo transitorio acabará en 404 igual (el export borra su fila).
async function getSuprimidos(): Promise<Set<string>> {
  const now = Date.now()
  if (cache && now - cache.ts < TTL_MS) return cache.set
  if (!SUPABASE_URL || !SUPABASE_KEY) return cache?.set ?? new Set()
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/web_suprimidos?select=codjugador`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`web_suprimidos HTTP ${res.status}`)
    const rows = (await res.json()) as Array<{ codjugador: string }>
    const set = new Set(rows.map((r) => String(r.codjugador)))
    cache = { set, ts: now }
    return set
  } catch {
    return cache?.set ?? new Set()
  }
}

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

  const suprimidos = await getSuprimidos()
  if (suprimidos.has(cod)) {
    return new NextResponse(PAGINA_410, { status: 410, headers: { 'content-type': 'text/html; charset=utf-8' } })
  }
  return NextResponse.next()
}

// ESTRICTAMENTE acotado: el middleware solo se invoca para las rutas de ficha de jugador (base y sub-rutas:
// temporada, v2…). El resto del sitio no pasa por esta capa.
export const config = { matcher: '/madrid/jugador/:path*' }
