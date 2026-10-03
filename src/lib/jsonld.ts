import { masMinutos } from '@/lib/horaMadrid'
import { SITE_URL } from './seo'

// Datos estructurados schema.org (JSON-LD). Solo tipos con mapeo HONESTO:
//   - WebSite / Organization: identidad del sitio (home + landings).
//   - BreadcrumbList: navegación (grupo, global, landings). Universal y seguro.
// NO se emite SportsTeam/SportsOrganization: una página de GRUPO es una clasificación/rankings de
// una competición (muchos equipos), no un equipo ni un organismo — forzarlo sería markup engañoso.
// Organization CON logo self-hosted (public/logo.png, 512x512, URL absoluta www — imagen real, no 404).

export function organizationLd() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Fútbol11Stats',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      'https://www.instagram.com/futbol11stats',
      'https://www.tiktok.com/@futbol11stats',
    ],
  }
}

export function websiteLd() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'Fútbol11Stats',
    url: `${SITE_URL}/`,
    inLanguage: 'es-ES',
    publisher: { '@id': `${SITE_URL}/#organization` },
    // Sitelinks searchbox: /buscar acepta ?q=<término>. Habilita el cuadro de búsqueda de Google para la marca.
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/buscar?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

// SportsTeam: la ficha de EQUIPO sí es una organización (no una persona), así que el markup es
// honesto. name + sport + memberOf (la competición). Opcionalmente logo (escudo self-hosted) y url.
export function sportsTeamLd(team: { name: string; url: string; sport?: string; competicion?: string | null; logo?: string | null }) {
  const node: Record<string, unknown> = {
    '@type': 'SportsTeam',
    name: team.name,
    sport: team.sport || 'Soccer',
    url: team.url,
  }
  if (team.competicion) node.memberOf = { '@type': 'SportsOrganization', name: team.competicion }
  if (team.logo) node.logo = team.logo
  return node
}

// El código 9999 / "PENDIENTE ASIGNACION CAMPO" es un MARCADOR DE RELLENO de la RFFM, no una instalación:
// hoy son 16 partidos y 2 de ellos tienen hora, así que sin esto emitiríamos un evento con un lugar
// inventado — justo lo que la regla prohíbe. Se comprueba por código Y por nombre: el código es el dato
// fiable, el nombre cubre el caso de que llegue sin código.
const CAMPO_SIN_ASIGNAR = '9999'
const RELLENO_RE = /pendiente|asignaci[oó]n|sin asignar|por determinar/i
function esCampoDeRelleno(codigo?: string | null, nombre?: string | null): boolean {
  return String(codigo ?? '') === CAMPO_SIN_ASIGNAR || RELLENO_RE.test(String(nombre ?? ''))
}

// SportsEvent a NIVEL DE EQUIPO.
//
// ⛔ LÍNEA ROJA (decisión cerrada 2026-08; ACOTADA el 2026-10-03, ver abajo): este nodo NUNCA lleva PERSONAS
//    —ni `athlete`, ni `attendee`, ni personas dentro de `performer`/`competitor`—, ni ahora ni como "mejora"
//    futura. Adjuntar jugadores al evento reintroduce la entidad-persona que descartamos al rechazar
//    Person/Athlete, y lo haría en páginas de RESULTADOS, hoy indexables INCLUSO EN JUVENIL precisamente por
//    no contener nombres de personas. Regla: marcamos EVENTOS, EQUIPOS y LUGARES; nunca PERSONAS.
//    ACOTACIÓN 2026-10-03 (pedida por Fernando para los avisos de Search Console): el texto anterior prohibía
//    `performer` POR SU NOMBRE. Ahora se emite `performer`/`competitor` con los dos EQUIPOS (SportsTeam, que
//    son organizaciones). El motivo de la prohibición era la persona, no la propiedad, y con equipos la
//    protección real se mantiene intacta. Lo que sigue vetado es meter personas en ellas.
//
// REGLA DE EMISIÓN (2026-10-03): devuelve null si falta startDate (fecha Y hora) o location (campo). Google
// exige las dos para Event, y emitirlas vacías o inventadas es lo que generaba los avisos. Un partido futuro
// sin horario confirmado simplemente NO lleva marcado: la página sigue siendo válida, sin el bloque.
export function sportsEventLd(ev: {
  local: string; visitante: string
  localUrl?: string | null; visitanteUrl?: string | null
  localLogo?: string | null; visitanteLogo?: string | null
  golesLocal?: number | null; golesVisitante?: number | null
  startDate?: string | null      // ISO 8601 CON desplazamiento (isoMadrid); sin hora no hay evento
  campo?: string | null          // Place.name LIMPIO (parseCampo().nombre), sin el código de superficie
  campoCodigo?: string | null    // para descartar el campo de RELLENO (ver CAMPO_SIN_ASIGNAR)
  campoDireccion?: string | null; campoLocalidad?: string | null; campoCp?: string | null
  campoLat?: number | null; campoLng?: number | null   // coords del PARTIDO (web_resultados.campo_*)
  competicion?: string | null    // superEvent + description
  jornadaTexto?: string | null   // "Jornada 7" | "Cuartos de final" -> description
  estado?: 'aplazado' | 'suspendido' | null   // -> eventStatus; hoy SIEMPRE null (ver DECISIONES-PENDIENTES)
  incidencia?: 'local' | 'visitante' | 'ambos' | null   // resultado ADMINISTRATIVO -> no hubo evento
}): Record<string, unknown> | null {
  // Un partido con resultado administrativo (retirada o incomparecencia) NO SE DISPUTÓ: no es un evento, y
  // marcarlo como tal afirma que ocurrió algo que no ocurrió. Fuera, aunque tenga fecha, hora y campo.
  if (ev.incidencia) return null
  if (!ev.startDate || !ev.campo || esCampoDeRelleno(ev.campoCodigo, ev.campo)) return null

  const team = (name: string, url?: string | null, logo?: string | null) => {
    const t: Record<string, unknown> = { '@type': 'SportsTeam', name }
    if (url) t.url = url
    if (logo) t.logo = logo
    return t
  }
  const jugado = ev.golesLocal != null && ev.golesVisitante != null
  const localTeam = team(ev.local, ev.localUrl, ev.localLogo)
  const awayTeam = team(ev.visitante, ev.visitanteUrl, ev.visitanteLogo)

  // location: Place con nombre y dirección postal; geo cuando el PARTIDO trae coords. NUNCA las del equipo
  // local: el partido puede jugarse en otro campo.
  const place: Record<string, unknown> = { '@type': 'Place', name: ev.campo }
  if (ev.campoDireccion || ev.campoLocalidad || ev.campoCp) {
    const addr: Record<string, unknown> = { '@type': 'PostalAddress', addressCountry: 'ES' }
    if (ev.campoDireccion) addr.streetAddress = ev.campoDireccion
    if (ev.campoLocalidad) addr.addressLocality = ev.campoLocalidad
    if (ev.campoCp) addr.postalCode = ev.campoCp
    place.address = addr
  }
  if (ev.campoLat != null && ev.campoLng != null) {
    place.geo = { '@type': 'GeoCoordinates', latitude: ev.campoLat, longitude: ev.campoLng }
  }

  const node: Record<string, unknown> = {
    '@type': 'SportsEvent',
    name: `${ev.local}${jugado ? ` ${ev.golesLocal}-${ev.golesVisitante} ` : ' vs '}${ev.visitante}`,
    sport: 'Soccer',
    startDate: ev.startDate,
    location: place,
    eventStatus: ev.estado === 'aplazado' ? 'https://schema.org/EventPostponed'
      : ev.estado === 'suspendido' ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    organizer: { '@type': 'Organization', name: 'Real Federación de Fútbol de Madrid' },
    homeTeam: localTeam,
    awayTeam: awayTeam,
    competitor: [localTeam, awayTeam],
    performer: [localTeam, awayTeam],
    // NB: schema.org no tiene campo de marcador; el resultado va en `name`.
  }
  // endDate = startDate + 120 min, misma zona. SOLO derivado del startDate que ya emitimos: nunca por su
  // cuenta. Si por lo que sea no se puede calcular, se omite en vez de inventarlo.
  const fin = masMinutos(ev.startDate, 120)
  if (fin) node.endDate = fin
  const desc = [ev.jornadaTexto, ev.competicion, `${ev.local} vs ${ev.visitante}`].filter(Boolean).join(' · ')
  if (ev.jornadaTexto || ev.competicion) node.description = desc
  // SIN superEvent (quitado 2026-10-03): anidar la competición como `SportsEvent` hacía que Google la
  // validara como un evento propio y le exigiera startDate y location — que una liga no tiene, y que no
  // vamos a inventar. Era la causa real de los avisos. La competición sigue en `description`.
  // Tras esto, el grafo tiene UN SOLO nivel de SportsEvent por partido; ningún otro nodo es de tipo Event
  // (los demás son Organization, WebSite, BreadcrumbList, SportsTeam, SportsOrganization, Place,
  // PostalAddress y GeoCoordinates).
  return node
}

// Envuelve uno o varios nodos en un documento @graph con @context.
// Acepta nulos y los DESCARTA: desde que sportsEventLd puede devolver null (partido sin fecha u hora o sin
// campo), los llamadores pasan listas con huecos y no tiene sentido que cada uno filtre por su cuenta.
export function graphLd(...nodes: (object | null | undefined)[]) {
  return { '@context': 'https://schema.org', '@graph': nodes.filter((n) => n != null) }
}
