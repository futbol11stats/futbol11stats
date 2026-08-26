export const revalidate = 2592000   // ISR 30d: el catálogo de clubes solo cambia al reexportar.

import type { Metadata } from 'next'
import Link from 'next/link'
import { getClubesIndex, clubSlug } from '@/lib/club'
import ClubesLista from '@/components/clubes/ClubesLista'
import JsonLd from '@/components/JsonLd'
import { graphLd, websiteLd, organizationLd, breadcrumbLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Clubes de fútbol aficionado y juvenil de Madrid | Fútbol11Stats',
  description: 'Directorio de los clubes del fútbol aficionado y juvenil de Madrid (RFFM): todos sus equipos, categorías, localidad y estadísticas en Fútbol11Stats.',
  alternates: { canonical: '/clubes' },
  openGraph: {
    title: 'Clubes de fútbol de Madrid | Fútbol11Stats',
    description: 'Directorio de clubes del fútbol aficionado y juvenil de Madrid con todos sus equipos.',
    url: '/clubes', siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website',
  },
}

export default async function ClubesPage() {
  const clubes = (await getClubesIndex()).map((c) => ({ ...c, href: `/clubes/${clubSlug(c.codclub, c.nombre)}` }))
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <JsonLd data={graphLd(websiteLd(), organizationLd(), breadcrumbLd([
        { name: 'Inicio', url: `${SITE_URL}/` },
        { name: 'Clubes', url: `${SITE_URL}/clubes` },
      ]))} />
      <nav className="text-sm text-chalk-600 mb-4 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span><span className="text-white">Clubes</span>
      </nav>
      <h1 className="font-display text-4xl font-bold text-white mb-1">Clubes de Madrid</h1>
      <p className="text-chalk-600 mb-6">
        {clubes.length} clubes del fútbol aficionado y juvenil (RFFM), con todos sus equipos. Usa el buscador
        del menú para ir directo a un club, equipo o jugador.
      </p>
      <ClubesLista clubes={clubes} />
    </div>
  )
}
