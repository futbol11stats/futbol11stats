// Generación de iCalendar (.ics, RFC 5545) para partidos. COMPARTIDO por el botón por partido (/api/ics/[id])
// y el feed suscribible por equipo (/api/calendario/equipo/[slug]). Puro salvo Date (válido en route handlers).

const CRLF = '\r\n'
const HOME = '🏠'
const AWAY = '✈️'
const HHMM = /^\d{1,2}:\d{2}$/
const DDMMYYYY = /^(\d{2})\/(\d{2})\/(\d{4})$/

// Escape RFC 5545 para valores de texto: backslash, ; , y saltos de línea.
function esc(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// Plegado a <=75 octetos, por PUNTOS DE CÓDIGO (Array.from) para no partir emojis (pares subrogados) ni acentos.
function fold(line: string): string {
  const cps = Array.from(line)
  if (cps.length <= 73) return line
  const parts: string[] = []
  let i = 0
  while (i < cps.length) { parts.push((i === 0 ? '' : ' ') + cps.slice(i, i + 72).join('')); i += 72 }
  return parts.join(CRLF)
}

const pad = (n: number) => String(n).padStart(2, '0')
const stampUTC = (ms: number) => {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

// VTIMEZONE estándar de Europe/Madrid (CET/CEST). Solo lo necesitan los eventos con hora (TZID).
const VTIMEZONE_MADRID = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Madrid',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST',
  'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET',
  'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
].join(CRLF)

export type MatchIcsInput = {
  // Identidad ESTABLE para el UID (no cambia con re-exports ni al concretarse la hora): grupo + jornada + equipos.
  codgrupo: string
  jornada: number | string
  codequipoLocal: string
  codequipoVisitante: string
  nombreLocal: string
  nombreVisitante: string
  golesLocal: number | null       // != null en ambos -> partido jugado (título con marcador)
  golesVisitante: number | null
  fecha: string                   // DD/MM/YYYY (obligatoria; sin ella no hay evento)
  hora: string | null             // HH:MM (Europe/Madrid) o null/'00:00' -> evento de DÍA COMPLETO
  campoNombre: string | null      // nombre LIMPIO (sin código de superficie)
  direccion: string | null        // dirección completa (calle, localidad, provincia) — de web_campo
  lat: number | null
  lng: number | null
  competicion: string             // "3ª RFEF Madrid · Jornada 12"
  url: string                     // ficha del partido (o resultados de la jornada)
  perspectiva: 'local' | 'visitante' | null   // lado del equipo del FEED (🏠/✈️). null = botón neutro.
}

// UID estable por partido: mismo evento -> el suscriptor lo ACTUALIZA (no duplica). Independiente de hora/estado.
export function matchUid(m: Pick<MatchIcsInput, 'codgrupo' | 'jornada' | 'codequipoLocal' | 'codequipoVisitante'>): string {
  return `f11s-${m.codgrupo}-${m.jornada}-${m.codequipoLocal}-${m.codequipoVisitante}@futbol11stats.com`
}

// Un VEVENT (sin envoltura). null si no hay fecha válida.
export function matchVevent(m: MatchIcsInput, nowMs: number): string | null {
  const md = DDMMYYYY.exec(m.fecha || '')
  if (!md) return null
  const [, dd, mm, yyyy] = md
  const jugado = m.golesLocal != null && m.golesVisitante != null
  const timed = !!m.hora && HHMM.test(m.hora) && m.hora !== '00:00'

  // Fecha/hora: con hora -> evento con TZID + fin a 2h; sin hora -> DÍA COMPLETO (VALUE=DATE, fin al día siguiente).
  let dtLines: string[]
  if (timed) {
    const mt = /^(\d{1,2}):(\d{2})$/.exec(m.hora as string) as RegExpExecArray
    const startMs = Date.UTC(+yyyy, +mm - 1, +dd, +mt[1], +mt[2])
    const fmt = (ms: number) => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00` }
    dtLines = [`DTSTART;TZID=Europe/Madrid:${fmt(startMs)}`, `DTEND;TZID=Europe/Madrid:${fmt(startMs + 2 * 3600 * 1000)}`]
  } else {
    const startMs = Date.UTC(+yyyy, +mm - 1, +dd)
    const fmtDate = (ms: number) => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` }
    dtLines = [`DTSTART;VALUE=DATE:${fmtDate(startMs)}`, `DTEND;VALUE=DATE:${fmtDate(startMs + 24 * 3600 * 1000)}`]
  }

  // TÍTULO: emoji casa/avión según el equipo del feed. Jugado -> marcador completo; futuro -> "vs Rival".
  // Neutro (botón): sin emoji, "Local vs Visitante". Nada de competición/jornada aquí (se corta en móvil).
  const emoji = m.perspectiva === 'local' ? HOME : m.perspectiva === 'visitante' ? AWAY : ''
  let summary: string
  if (jugado) {
    summary = `${emoji ? emoji + ' ' : ''}${m.nombreLocal} ${m.golesLocal}-${m.golesVisitante} ${m.nombreVisitante}`
  } else if (m.perspectiva) {
    summary = `${emoji} vs ${m.perspectiva === 'local' ? m.nombreVisitante : m.nombreLocal}`
  } else {
    summary = `${m.nombreLocal} vs ${m.nombreVisitante}`
  }

  const campoLinea = m.campoNombre ? `${m.campoNombre}${m.direccion ? `, ${m.direccion}` : ''}` : (m.direccion || '')
  const description = [m.competicion, `${m.nombreLocal} — ${m.nombreVisitante}`, ...(campoLinea ? [campoLinea] : []), '', m.url].join('\n')

  // SEQUENCE monótona por tiempo de generación: cualquier cambio (hora que se concreta, aplazamiento, campo,
  // resultado) llega en el siguiente refresco y REEMPLAZA el evento (UID estable), nunca lo duplica.
  const sequence = Math.floor((nowMs - Date.UTC(2020, 0, 1)) / 3600000)

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${matchUid(m)}`,
    `DTSTAMP:${stampUTC(nowMs)}`,
    `SEQUENCE:${sequence}`,
    ...dtLines,
    fold(`SUMMARY:${esc(summary)}`),
    fold(`DESCRIPTION:${esc(description)}`),
    fold(`URL:${esc(m.url)}`),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
  ]
  if (campoLinea) lines.push(fold(`LOCATION:${esc(campoLinea)}`))
  if (m.lat != null && m.lng != null) {
    lines.push(`GEO:${m.lat};${m.lng}`)
    lines.push(fold(`X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-APPLE-RADIUS=100;X-TITLE=${esc(m.campoNombre || campoLinea)}:geo:${m.lat},${m.lng}`))
  }
  // Aviso 24 h antes (solo partidos NO jugados; el usuario puede quitarlo desde su calendario).
  if (!jugado) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${esc(summary)}`), 'TRIGGER:-PT24H', 'END:VALARM')
  }
  lines.push('END:VEVENT')
  return lines.join(CRLF)
}

// Envuelve VEVENTs en un VCALENDAR. `name` = X-WR-CALNAME (nombre del calendario en la app). `ttlHours` publica
// REFRESH-INTERVAL + X-PUBLISHED-TTL (Apple lo respeta; Google lo ignora y sondea a su ritmo).
export function wrapCalendar(vevents: string[], opts?: { name?: string; ttlHours?: number }): string {
  const head = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Futbol11Stats//Calendario//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  if (opts?.name) { head.push(fold(`X-WR-CALNAME:${esc(opts.name)}`), 'X-WR-TIMEZONE:Europe/Madrid') }
  if (opts?.ttlHours) { head.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${opts.ttlHours}H`, `X-PUBLISHED-TTL:PT${opts.ttlHours}H`) }
  return [...head, VTIMEZONE_MADRID, ...vevents, 'END:VCALENDAR'].join(CRLF) + CRLF
}

// Atajo: .ics de UN partido (botón). null si no hay fecha válida.
export function buildMatchIcs(m: MatchIcsInput, nowMs: number): string | null {
  const ve = matchVevent(m, nowMs)
  if (!ve) return null
  return wrapCalendar([ve])
}
