export const revalidate = 2592000  // ISR 30d (Fluid CPU free tier): contenido congelado en pretemporada; cada deploy/re-export invalida TODA la caché, así que los datos nuevos llegan igual. De ~4 regeneraciones/día/URL a 1 por deploy.

import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/seo'
import { graphLd, websiteLd, organizationLd, breadcrumbLd } from '@/lib/jsonld'
import { ORDEN_AFICIONADOS as COMPETICION_ORDER } from '@/lib/competiciones'
import CompeticionCard from '@/components/ui/CompeticionCard'
import { cacheIndices } from '@/lib/cacheComp'
import { getGruposIndice } from '@/lib/temporadas'

export const metadata: Metadata = {
  title: 'Fútbol Aficionados Madrid — categorías y grupos | Fútbol11Stats',
  description: 'Clasificaciones, goleadores y estadísticas del fútbol aficionado de Madrid (RFFM): 3ª RFEF, 1ª Autonómica, Preferente, 1ª y 2ª Aficionados.',
  alternates: { canonical: '/madrid/aficionados' },
  openGraph: {
    title: 'Fútbol Aficionados Madrid | Fútbol11Stats',
    description: 'Categorías y grupos del fútbol aficionado de Madrid.',
    url: '/madrid/aficionados',
    siteName: 'Fútbol11Stats',
    locale: 'es_ES',
    type: 'website',
  },
}

// nombre_historico solo está poblado en T17-T19; mapeamos nombre_comp -> nombre_historico
async function getHistoricoMap() {
  return cacheIndices(async () => {
    const { data } = await supabase
      .from('web_grupos')
      .select('nombre_comp, nombre_historico')
      .not('nombre_historico', 'is', null)
    const map: Record<string, string> = {}
    for (const g of data || []) {
      if (g.nombre_historico) map[g.nombre_comp] = g.nombre_historico
    }
    return map
  }, ['getHistoricoMap-afic'])
}


export default async function AficionadosPage() {
  const [grupos, historicoMap] = await Promise.all([getGruposIndice('AFICIONADO'), getHistoricoMap()])

  // Ordenar por número de grupo en cliente (evita orden alfabético tipo "Grupo 10" < "Grupo 2")
  grupos.sort((a, b) => {
    const numA = parseInt(a.nombre_grupo.replace(/\D/g, '')) || 0
    const numB = parseInt(b.nombre_grupo.replace(/\D/g, '')) || 0
    return numA - numB
  })

  const map: Record<string, typeof grupos> = {}
  for (const g of grupos) {
    if (!map[g.nombre_comp]) map[g.nombre_comp] = []
    map[g.nombre_comp].push(g)
  }

  // Competiciones conocidas primero, el resto al final por orden alfabético
  const ordenadas = [
    ...COMPETICION_ORDER.filter(c => map[c]),
    ...Object.keys(map).filter(c => !COMPETICION_ORDER.includes(c)).sort(),
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <JsonLd data={graphLd(websiteLd(), organizationLd(), breadcrumbLd([
        { name: 'Inicio', url: `${SITE_URL}/` },
        { name: 'Aficionados', url: `${SITE_URL}/madrid/aficionados` },
      ]))} />
      {/* Breadcrumb */}
      <nav className="text-sm text-chalk-600 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <span className="text-white">Aficionados</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <p className="text-grass-400 text-xs font-semibold uppercase tracking-widest mb-1">
          Categoría
        </p>
        <h1 className="font-display text-4xl font-bold text-white flex items-center gap-3">
          <span className="w-1.5 h-9 bg-grass-500 rounded-full inline-block" />
          Aficionados
        </h1>
        <p className="text-chalk-600 text-sm mt-2">
          {grupos.length} grupo{grupos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Competiciones */}
      <div className="space-y-3">
        {ordenadas.map(comp => (
          <CompeticionCard key={comp} nombre={comp} grupos={map[comp]} categoria="aficionados" nombreHistorico={historicoMap[comp]} />
        ))}
        {grupos.length === 0 && (
          <p className="text-chalk-600 text-sm text-center py-12">
            No hay competiciones disponibles.
          </p>
        )}
      </div>
    </div>
  )
}

