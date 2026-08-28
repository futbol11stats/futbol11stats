export const revalidate = 2592000   // ISR 30d: el catálogo de campos solo cambia al reexportar.

import type { Metadata } from 'next'
import Link from 'next/link'
import { getCamposIndex, campoSlug } from '@/lib/campo'
import { parseCampo } from '@/lib/club'
import CamposLista from '@/components/campos/CamposLista'
import JsonLd from '@/components/JsonLd'
import { graphLd, websiteLd, organizationLd, breadcrumbLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Campos de fútbol de Madrid | Fútbol11Stats',
  description: 'Directorio de los campos e instalaciones del fútbol aficionado y juvenil de Madrid (RFFM): localidad, ubicación en el mapa y los equipos que juegan en cada uno.',
  alternates: { canonical: '/campos' },
  openGraph: {
    title: 'Campos de fútbol de Madrid | Fútbol11Stats',
    description: 'Directorio de campos del fútbol aficionado y juvenil de Madrid con su ubicación y los equipos que juegan allí.',
    url: '/campos', siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website',
  },
}

export default async function CamposPage() {
  const campos = (await getCamposIndex()).map((c) => {
    const nombre = parseCampo(c.nombre).nombre
    return { codigo: c.codigo, nombre, localidad: c.localidad, provincia: c.provincia, nEquipos: c.nEquipos, href: `/campos/${campoSlug(c.codigo, nombre)}` }
  })
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <JsonLd data={graphLd(websiteLd(), organizationLd(), breadcrumbLd([
        { name: 'Inicio', url: `${SITE_URL}/` },
        { name: 'Campos', url: `${SITE_URL}/campos` },
      ]))} />
      <nav className="text-sm text-chalk-600 mb-4 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span><span className="text-white">Campos</span>
      </nav>
      <h1 className="font-display text-4xl font-bold text-white mb-1">Campos de Madrid</h1>
      <p className="text-chalk-600 mb-6">
        {campos.length} campos e instalaciones del fútbol aficionado y juvenil (RFFM), con su ubicación y los
        equipos que juegan en cada uno.
      </p>
      <CamposLista campos={campos} />
    </div>
  )
}
