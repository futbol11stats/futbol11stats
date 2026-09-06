import { NextResponse } from 'next/server'
import { comprobarSitemaps } from '@/lib/sitemapHealth'

// Endpoint de SALUD del sitemap (POST -> pasa el WAF, como /api/revalidate). Lo llama el pipeline tras
// revalidar los sitemaps: si viene ok:false (vacío REAL), dispara el aviso ruidoso (alerta.py). Devuelve
// siempre 200 con el veredicto en el cuerpo; la decisión de alarma la toma quien llama (para no confundir
// "vacío" con "no verificable"). El cron de Vercel usa /api/cron/sitemap-check (GET) con el mismo detector.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET
  const provided = req.headers.get('x-revalidate-secret')
  // Si hay secreto configurado, se exige (como en revalidate). Si no, abierto (solo lee sitemaps públicos).
  if (secret && provided !== secret) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }
  const health = await comprobarSitemaps()
  return NextResponse.json(health)
}
