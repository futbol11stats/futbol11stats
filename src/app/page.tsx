export const revalidate = 2592000  // ISR 30d (Fluid CPU free tier): contenido congelado en pretemporada; cada deploy/re-export invalida TODA la caché, así que los datos nuevos llegan igual. De ~4 regeneraciones/día/URL a 1 por deploy.

import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { graphLd, websiteLd, organizationLd } from '@/lib/jsonld'
import { ORDEN_AFICIONADOS, ORDEN_JUVENILES } from '@/lib/competiciones'
import CompeticionCard from '@/components/ui/CompeticionCard'
import { getGruposIndice } from '@/lib/temporadas'

// Marca neutral con Madrid como ámbito ACTUAL (preparada para ampliar a otras federaciones).
export const metadata: Metadata = {
  title: 'Fútbol11Stats — Estadísticas del fútbol aficionado · Madrid',
  description: 'Clasificaciones, goleadores, fantasy y ELO del fútbol aficionado y juvenil. Todas las competiciones de la RFFM (Madrid): 5 temporadas, más de 110.000 partidos y 38.000 jugadores.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Fútbol11Stats — Estadísticas del fútbol aficionado · Madrid',
    description: 'Clasificaciones, goleadores, fantasy y ELO del fútbol aficionado y juvenil de Madrid.',
    url: '/',
    siteName: 'Fútbol11Stats',
    locale: 'es_ES',
    type: 'website',
  },
}

// Orden desde la fuente única (aficionados + juveniles); cada rama filtra el que le toca.
const COMPETICION_ORDER = [...ORDEN_AFICIONADOS, ...ORDEN_JUVENILES]

export default async function Home() {
  // Cada categoría en la temporada activa de cada competición (fuente única data-driven).
  const [aficionados, juvenil] = await Promise.all([getGruposIndice('AFICIONADO'), getGruposIndice('JUVENIL')])

  // Ordenar por número de grupo en cliente (evita orden alfabético tipo "Grupo 10" < "Grupo 2")
  const sortG = (arr: typeof aficionados) => arr.sort((a, b) => {
    const numA = parseInt(a.nombre_grupo.replace(/\D/g, '')) || 0
    const numB = parseInt(b.nombre_grupo.replace(/\D/g, '')) || 0
    return numA - numB
  })
  sortG(aficionados)
  sortG(juvenil)

  // Agrupar por competición
  const groupBy = (arr: typeof aficionados) => {
    const map: Record<string, typeof aficionados> = {}
    for (const g of arr) {
      if (!map[g.nombre_comp]) map[g.nombre_comp] = []
      map[g.nombre_comp].push(g)
    }
    return map
  }

  const aficionadosMap = groupBy(aficionados)
  const juvenilMap = groupBy(juvenil)

  return (
    <div>
      <JsonLd data={graphLd(websiteLd(), organizationLd())} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-pitch-800 border-b border-pitch-700">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, #1a7a3c 40px, #1a7a3c 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, #1a7a3c 40px, #1a7a3c 41px)'
          }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-grass-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Real Federación de Fútbol de Madrid
            </p>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold text-white leading-none mb-4">
              FÚTBOL MADRID<br />
              <span className="text-grass-400">EN DATOS</span>
            </h1>
            <p className="text-chalk-600 text-lg mb-8">
              Clasificaciones, goleadores, fantasy y ELO de las 10 competiciones RFFM.
              5 temporadas · 110.000+ partidos · 38.000+ jugadores.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/madrid/aficionados" className="bg-grass-500 hover:bg-grass-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">
                Aficionados
              </Link>
              <Link href="/madrid/juveniles" className="bg-pitch-700 hover:bg-pitch-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm border border-pitch-600">
                Juvenil
              </Link>
              {/* Eje distinto (directorio, no categoría): estilo propio. Hub que enlaza a las 40k fichas. */}
              <Link href="/clubes" className="bg-pitch-800 hover:bg-grass-500 text-grass-300 hover:text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm border border-grass-500/40">
                Clubes
              </Link>
              <Link href="/campos" className="bg-pitch-800 hover:bg-grass-500 text-grass-300 hover:text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm border border-grass-500/40">
                Campos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Competiciones */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-10">
          {/* Aficionados */}
          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-grass-500 rounded-full inline-block" />
              Aficionados
            </h2>
            <div className="space-y-3">
              {[...COMPETICION_ORDER.filter(c => aficionadosMap[c]), ...Object.keys(aficionadosMap).filter(c => !COMPETICION_ORDER.includes(c)).sort()].map(comp => (
                <CompeticionCard
                  key={comp}
                  nombre={comp}
                  grupos={aficionadosMap[comp]}
                  categoria="aficionados"
                />
              ))}
            </div>
          </div>

          {/* Juvenil */}
          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-amber-500 rounded-full inline-block" />
              Juvenil
            </h2>
            <div className="space-y-3">
              {[...COMPETICION_ORDER.filter(c => juvenilMap[c]), ...Object.keys(juvenilMap).filter(c => !COMPETICION_ORDER.includes(c)).sort()].map(comp => (
                <CompeticionCard
                  key={comp}
                  nombre={comp}
                  grupos={juvenilMap[comp]}
                  categoria="juveniles"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

