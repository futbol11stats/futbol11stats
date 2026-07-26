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

// Envuelve uno o varios nodos en un documento @graph con @context.
export function graphLd(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}
