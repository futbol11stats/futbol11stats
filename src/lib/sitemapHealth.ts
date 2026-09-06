import { SITE_URL } from '@/lib/seo'

// Detector COMPARTIDO por las tres capas de aviso de "sitemap vacío": el cron de Vercel (correo de
// madrugada), el endpoint de salud POST (que llama el pipeline) y el dashboard. Un único criterio para
// que los tres cuenten lo mismo.
//
// CLAVE (evitar falsos positivos): la PARTICIÓN 0 de cada sitemap SIEMPRE debe tener datos (hay ~39k
// jugadores y ~1,9k equipos, así que 0.xml está lleno salvo que algo haya fallado). Distinguimos:
//   · 'vacio'          -> nos sirvió XML VÁLIDO con 0 <loc>: problema REAL (esto es lo que se avisa).
//   · 'no_verificable' -> no pudimos leerlo (challenge del WAF, error de red, no-200, no-XML): NO es un
//                          vacío, NO dispara alarma. Un aviso que salta por causas ajenas se acaba
//                          ignorando, y entonces el bueno también.
//   · 'ok'             -> XML válido con >0 <loc>.
// Solo miramos la partición 0 a propósito: es robusto aunque robots.txt esté anunciando el nº de
// particiones del fallback (las de la cola sí pueden salir vacías legítimamente); 0.xml no.

export type ParticionEstado = { url: string; estado: 'ok' | 'vacio' | 'no_verificable'; locs: number; detalle?: string }
export type SitemapHealth = { ok: boolean; vacios: string[]; comprobadas: ParticionEstado[]; ts: string }

const OBJETIVOS = ['/jugadores/sitemap/0.xml', '/equipos/sitemap/0.xml']

async function comprobarUno(path: string): Promise<ParticionEstado> {
  const url = `${SITE_URL}${path}`
  try {
    const r = await fetch(url, { cache: 'no-store', headers: { 'user-agent': 'futbol11stats-sitemap-health' } })
    const t = await r.text()
    if (!r.ok) return { url, estado: 'no_verificable', locs: 0, detalle: `HTTP ${r.status}` }
    const cabeza = t.slice(0, 600)
    // ¿Nos ha caído el "Security Checkpoint" del WAF en vez del XML? -> no verificable, sin alarma.
    const esChallenge = /Security Checkpoint|_vercel\/security/i.test(cabeza)
    const pareceXml = /<urlset|<\?xml/i.test(cabeza)
    if (esChallenge || !pareceXml) return { url, estado: 'no_verificable', locs: 0, detalle: 'no es XML (¿challenge del WAF?)' }
    const locs = (t.match(/<loc>/g) || []).length
    return { url, estado: locs > 0 ? 'ok' : 'vacio', locs }
  } catch (e) {
    return { url, estado: 'no_verificable', locs: 0, detalle: (e as Error).message }
  }
}

export async function comprobarSitemaps(): Promise<SitemapHealth> {
  const comprobadas = await Promise.all(OBJETIVOS.map(comprobarUno))
  const vacios = comprobadas.filter((c) => c.estado === 'vacio').map((c) => c.url)
  // ok = NINGÚN vacío real. Los 'no_verificable' NO rompen ok (no son un problema del sitemap).
  return { ok: vacios.length === 0, vacios, comprobadas, ts: new Date().toISOString() }
}
