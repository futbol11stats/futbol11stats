import { buildTeamCalendar } from '@/lib/calendarioEquipo'

// Feed .ics suscribible por equipo (webcal). Toda la temporada del equipo. TTL de CDN 2 h: cuando el cliente
// sondea (Google ~diario, Apple horario-diario según ajuste), obtiene datos frescos, no una copia vieja del edge.
// El slug es "<codequipo>.ics" para que las apps de calendario reconozcan la suscripción por su extensión.

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cod = String(slug).replace(/\.ics$/i, '')
  if (!/^\d+$/.test(cod)) return new Response('Not found', { status: 404 })

  const res = await buildTeamCalendar(cod, Date.now())
  if (!res) return new Response('El equipo no tiene partidos', { status: 404 })

  return new Response(res.ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="equipo-${cod}.ics"`,
      'Cache-Control': 'public, max-age=7200, s-maxage=7200, stale-while-revalidate=86400',
    },
  })
}
