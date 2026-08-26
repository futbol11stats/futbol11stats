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

// SportsEvent a NIVEL DE EQUIPO para los partidos de la pestaña de RESULTADOS.
//
// ⛔ LÍNEA ROJA (decisión cerrada 2026-08, ver PENDIENTES "Datos estructurados"): este nodo NUNCA lleva
//    `athlete`, `performer` ni `attendee`, ni ahora ni como "mejora" futura. Adjuntar jugadores al evento
//    reintroduce exactamente la entidad-persona que descartamos al rechazar Person/Athlete, y además lo haría
//    en las páginas de RESULTADOS, que hoy son indexables INCLUSO EN JUVENIL precisamente porque no contienen
//    nombres de personas. Solo EQUIPOS (organizaciones), fecha, campo (instalación pública) y marcador.
//    Regla general: marcamos EVENTOS y ORGANIZACIONES; nunca PERSONAS.
export function sportsEventLd(ev: {
  local: string; visitante: string
  localUrl?: string | null; visitanteUrl?: string | null
  localLogo?: string | null; visitanteLogo?: string | null
  golesLocal?: number | null; golesVisitante?: number | null
  fechaIso?: string | null       // 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM'
  campo?: string | null
  competicion?: string | null    // superEvent: nombre de la competición/ronda + temporada
}) {
  const team = (name: string, url?: string | null, logo?: string | null) => {
    const t: Record<string, unknown> = { '@type': 'SportsTeam', name }
    if (url) t.url = url
    if (logo) t.logo = logo
    return t
  }
  const jugado = ev.golesLocal != null && ev.golesVisitante != null
  const node: Record<string, unknown> = {
    '@type': 'SportsEvent',
    name: `${ev.local}${jugado ? ` ${ev.golesLocal}-${ev.golesVisitante} ` : ' vs '}${ev.visitante}`,
    sport: 'Soccer',
    homeTeam: team(ev.local, ev.localUrl, ev.localLogo),
    awayTeam: team(ev.visitante, ev.visitanteUrl, ev.visitanteLogo),
    // NB: schema.org no tiene campo de marcador; el resultado va en `name`. NADA de personas (ver línea roja).
  }
  if (ev.fechaIso) node.startDate = ev.fechaIso
  if (ev.campo) node.location = { '@type': 'Place', name: ev.campo }
  if (ev.competicion) node.superEvent = { '@type': 'SportsEvent', name: ev.competicion }
  return node
}

// Envuelve uno o varios nodos en un documento @graph con @context.
export function graphLd(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}
