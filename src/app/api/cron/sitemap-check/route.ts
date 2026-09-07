import { NextResponse } from 'next/server'
import { comprobarSitemaps } from '@/lib/sitemapHealth'

// CRON de Vercel (ver vercel.json): comprueba a diario que los sitemaps sirven datos. Reutiliza el canal
// de correo que Vercel YA envía a Fernando: si esta ruta devuelve 5xx, la ejecución del cron FALLA y
// Vercel manda su aviso de "cron failed" -> aviso de MADRUGADA sin montar SMTP ni Telegram. De paso es la
// SONDA DIARIA del plan (un solo mecanismo: detección + aviso).
//
// FALSOS POSITIVOS (crítico): solo se devuelve 5xx cuando hay un VACÍO REAL (XML válido con 0 <loc>). Si
// no se pudo comprobar (BD caída, challenge del WAF, error de red), el detector marca 'no_verificable' y
// devolvemos 200 -> el cron NO falla por causas ajenas. Un aviso que salta por lo que no toca se ignora.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// El cron hace fetch de las particiones del sitemap (pueden regenerar y tardar). Se sube sobre el default
// global (60s) para que un fetch lento NO devuelva 5xx y dispare un falso "cron failed". Corre 1 vez/día.
export const maxDuration = 120

export async function GET(req: Request) {
  // Si hay CRON_SECRET, Vercel lo envía como "Authorization: Bearer <secret>". Lo exigimos para que nadie
  // dispare la comprobación desde fuera. Si no está configurado, la ruta funciona igual (cero config).
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
    }
  }

  const health = await comprobarSitemaps()
  if (!health.ok) {
    // Vacío REAL -> 5xx -> Vercel marca el cron como fallido -> correo a Fernando.
    return NextResponse.json({ ...health, alerta: 'SITEMAP VACÍO' }, { status: 500 })
  }
  // ok o solo 'no_verificable' -> 200: nada de falsos positivos.
  return NextResponse.json(health, { status: 200 })
}
