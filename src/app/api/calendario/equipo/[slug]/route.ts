import { buildTeamCalendar } from '@/lib/calendarioEquipo'
import { supabase } from '@/lib/supabase'

// Feed .ics suscribible por equipo (webcal). Toda la temporada del equipo. TTL de CDN 2 h: cuando el cliente
// sondea (Google ~diario, Apple horario-diario según ajuste), obtiene datos frescos, no una copia vieja del edge.
// El slug es "<codequipo>.ics" para que las apps de calendario reconozcan la suscripción por su extensión.

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cod = String(slug).replace(/\.ics$/i, '')
  if (!/^\d+$/.test(cod)) return new Response('Not found', { status: 404 })

  let res
  try {
    res = await buildTeamCalendar(cod, Date.now())
  } catch {
    // Error transitorio (p.ej. timeout de consulta): reintentable, NUNCA "no tiene partidos".
    return new Response('Temporalmente no disponible, reinténtalo', {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' },
    })
  }
  if (!res) return new Response('El equipo no tiene partidos', { status: 404 })

  // Contador ANÓNIMO de suscripciones (tabla web_calendario_hits): SOLO codequipo + día, sin IP, sin user-agent,
  // sin cookie, sin identificador. Es un agregado ("el feed del equipo X se pidió hoy"), no un registro de quién
  // sigue a quién -> no es dato personal, no toca la política de privacidad. Se cuenta en el cache-miss del edge
  // (una revalidación ~cada 2h por equipo con suscripción viva): el patrón delata la suscripción y el coste (1 upsert)
  // es ínfimo frente al build del feed -> la medición no genera más carga que la que mide.
  //
  // SEGURIDAD (CAL_HIT_SECRET): la anon key va en el bundle y es pública, así que sin protección cualquiera podría
  // llamar la RPC e inflar el contador. La función exige un SECRETO que solo conoce el servidor (env CAL_HIT_SECRET,
  // comparado en la función contra app_config.cal_hit_secret). Se eligió el secreto y NO un cliente service_role
  // porque meter una clave de acceso total a la BD para blindar una estadística de bajo valor es desproporcionado:
  // si el secreto se filtra, el daño máximo es inflar el contador (justo lo que ya asumíamos), nada de acceso a datos.
  // ROTACIÓN: cambiar el valor en Vercel (CAL_HIT_SECRET) y en la BD (app_config.cal_hit_secret). Mientras difieran,
  // el contador simplemente no incrementa; el feed se sirve igual. Nada se rompe.
  //
  // FALLO SILENCIOSO: si el secreto falta o no coincide, la función no incrementa y no lanza; y aquí va en try/catch.
  // Medir NUNCA debe tumbar el feed.
  try { await supabase.rpc('web_calendario_hit', { p_cod: cod, p_secret: process.env.CAL_HIT_SECRET ?? '' }) } catch { /* contador best-effort */ }

  return new Response(res.ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="equipo-${cod}.ics"`,
      'Cache-Control': 'public, max-age=7200, s-maxage=7200, stale-while-revalidate=86400',
    },
  })
}
