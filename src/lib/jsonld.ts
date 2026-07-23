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

// Envuelve uno o varios nodos en un documento @graph con @context.
export function graphLd(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}
