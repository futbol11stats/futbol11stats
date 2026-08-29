// Generación de iCalendar (.ics, RFC 5545) para partidos. Reutilizable por el BOTÓN por partido (ruta
// /api/ics/[id]) y, más adelante, por el FEED suscribible por equipo (mismo constructor de VEVENT).
// Puro (sin imports de servidor) salvo el uso de Date, válido en route handlers.

const CRLF = '\r\n'

// Escape RFC 5545 para valores de texto (SUMMARY/DESCRIPTION/LOCATION…): backslash, ; , y saltos de línea.
function esc(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// Plegado de líneas a <=75 octetos (aprox. por caracteres; nuestros campos son texto latino, sin pares
// subrogados). Continuación con CRLF + espacio.
function fold(line: string): string {
  if (line.length <= 73) return line
  const parts: string[] = []
  let i = 0
  while (i < line.length) { parts.push((i === 0 ? '' : ' ') + line.slice(i, i + 72)); i += 72 }
  return parts.join(CRLF)
}

const pad = (n: number) => String(n).padStart(2, '0')

// "DD/MM/YYYY" + "HH:MM" (hora local de Madrid) -> componentes de reloj de pared, con fin = inicio + 2h
// (con salto de día correcto). Se opera en UTC SOLO para la aritmética de fecha; el valor se emite como
// hora local con TZID=Europe/Madrid (el DST lo resuelve la app con el VTIMEZONE). null si el formato falla.
function parseInicioFin(fecha: string, hora: string): { start: string; end: string } | null {
  const md = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha || '')
  const mt = /^(\d{1,2}):(\d{2})$/.exec(hora || '')
  if (!md || !mt) return null
  const [, dd, mm, yyyy] = md
  const [, hh, mi] = mt
  const startMs = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi)
  const endMs = startMs + 2 * 3600 * 1000
  const fmt = (ms: number) => {
    const d = new Date(ms)
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`
  }
  return { start: fmt(startMs), end: fmt(endMs) }
}

// VTIMEZONE estándar de Europe/Madrid (CET/CEST, último domingo de marzo/octubre).
const VTIMEZONE_MADRID = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Madrid',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
].join(CRLF)

export type MatchIcsInput = {
  // Identidad ESTABLE para el UID (no cambia aunque el pipeline re-exporte): grupo + jornada + los dos equipos.
  codgrupo: string
  jornada: number | string
  codequipoLocal: string
  codequipoVisitante: string
  nombreLocal: string
  nombreVisitante: string
  fecha: string          // DD/MM/YYYY
  hora: string           // HH:MM (Europe/Madrid)
  campoNombre: string | null   // nombre LIMPIO del campo (sin código de superficie)
  lat: number | null
  lng: number | null
  competicion: string    // p.ej. "3ª RFEF Madrid · Jornada 3 · 2026-27"
  url: string            // enlace a la ficha del partido (o a los resultados de la jornada)
}

// UID estable por partido (mismo evento -> reimportar reemplaza, no duplica).
export function matchUid(m: Pick<MatchIcsInput, 'codgrupo' | 'jornada' | 'codequipoLocal' | 'codequipoVisitante'>): string {
  return `f11s-${m.codgrupo}-${m.jornada}-${m.codequipoLocal}-${m.codequipoVisitante}@futbol11stats.com`
}

// Un VEVENT (sin envoltura). null si la fecha/hora no son válidas (un partido sin hora no genera evento).
export function matchVevent(m: MatchIcsInput, nowMs: number): string | null {
  const df = parseInicioFin(m.fecha, m.hora)
  if (!df) return null
  const dtstamp = (() => {
    const d = new Date(nowMs)
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  })()
  // SEQUENCE monótona por tiempo (horas desde 2020): al re-descargar tras un cambio, el nº sube -> la app
  // reemplaza el evento en vez de duplicarlo. No es auto-actualización (eso es el feed suscribible).
  const sequence = Math.floor((nowMs - Date.UTC(2020, 0, 1)) / 3600000)
  const desc = `${m.competicion}\n\n${m.url}`
  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${matchUid(m)}`,
    `DTSTAMP:${dtstamp}`,
    `SEQUENCE:${sequence}`,
    `DTSTART;TZID=Europe/Madrid:${df.start}`,
    `DTEND;TZID=Europe/Madrid:${df.end}`,
    fold(`SUMMARY:${esc(`${m.nombreLocal} vs ${m.nombreVisitante}`)}`),
    fold(`DESCRIPTION:${esc(desc)}`),
    fold(`URL:${esc(m.url)}`),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
  ]
  if (m.campoNombre) lines.push(fold(`LOCATION:${esc(m.campoNombre)}`))
  if (m.lat != null && m.lng != null) {
    lines.push(`GEO:${m.lat};${m.lng}`)
    // Apple: habilita "Cómo llegar" desde el evento (navegación directa a las coordenadas).
    lines.push(fold(`X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-APPLE-RADIUS=100;X-TITLE=${esc(m.campoNombre || '')}:geo:${m.lat},${m.lng}`))
  }
  lines.push('END:VEVENT')
  return lines.join(CRLF)
}

// Envuelve uno o varios VEVENT en un VCALENDAR completo (con VTIMEZONE). Reutilizable por el feed.
export function wrapCalendar(vevents: string[], name?: string): string {
  const head = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Futbol11Stats//Calendario//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  if (name) { head.push(fold(`X-WR-CALNAME:${esc(name)}`)); head.push('X-WR-TIMEZONE:Europe/Madrid') }
  return [...head, VTIMEZONE_MADRID, ...vevents, 'END:VCALENDAR'].join(CRLF) + CRLF
}

// Atajo: .ics de UN partido. null si no hay fecha/hora válidas.
export function buildMatchIcs(m: MatchIcsInput, nowMs: number): string | null {
  const ve = matchVevent(m, nowMs)
  if (!ve) return null
  return wrapCalendar([ve])
}
