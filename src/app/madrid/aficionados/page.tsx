export const revalidate = 2592000  // ISR 30d (Fluid CPU free tier): contenido congelado en pretemporada; cada deploy/re-export invalida TODA la caché, así que los datos nuevos llegan igual. De ~4 regeneraciones/día/URL a 1 por deploy.

import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import Sello from '@/components/Sello'
import { SITE_URL } from '@/lib/seo'
import { graphLd, websiteLd, organizationLd, breadcrumbLd } from '@/lib/jsonld'
import { ORDEN_AFICIONADOS as COMPETICION_ORDER, segRondaActual, numRondas, historicoLegenda } from '@/lib/competiciones'
import { familiaSello, nombreOficial } from '@/lib/sellos'
import { cacheIndices } from '@/lib/cacheComp'
import { getGruposIndice } from '@/lib/temporadas'
import { codToSlug } from '@/lib/temporadaSlug'

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
          <CompeticionCard key={comp} nombre={comp} grupos={map[comp]} nombreHistorico={historicoMap[comp]} />
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

function CompeticionCard({
  nombre,
  grupos,
  nombreHistorico,
}: {
  nombre: string
  grupos: { codtemporada: number; codgrupo: string; nombre_grupo: string; jornada_actual: number; slug_comp: string; slug_grupo: string; tipo?: string; rondas?: unknown }[]
  nombreHistorico?: string
}) {
  // Temporada de ESTA competición (todos sus grupos comparten temporada activa). Sustituye al '2025-26' global.
  const temp = codToSlug(grupos[0].codtemporada)
  const nombreCorto: Record<string, string> = {
    '3ª RFEF Madrid': '3ª RFEF',
    '1ª Autonómica Madrid': '1ª Autonómica',
    'Preferente Madrid': 'Preferente',
    '1ª Aficionados Madrid': '1ª Aficionados',
    '2ª Aficionados Madrid': '2ª Aficionados',
  }
  // Sello por FAMILIA: web_grupos no trae slug_familia, pero en las filas fam-* el slug_comp ES el slug
  // de familia -> resuelve el sello correcto (las Copa 1ª Autonómica llevan botón RFFM, no copa).
  const famSlug = grupos.find((g) => String(g.codgrupo).startsWith('fam-'))?.slug_comp
  // Título: denominación oficial donde hay espacio (Tercera Federación RFEF, Liga Nacional Juvenil); resto, corto.
  const titulo = nombreOficial(nombre) ?? (nombreCorto[nombre] || nombre)
  // Leyenda de nombre antiguo corregida (el nombre_historico de las familias de copa es ruido).
  const hist = historicoLegenda(nombre, nombreHistorico)

  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden hover:border-grass-500/50 transition-colors">
      <div className="px-4 py-3 border-b border-pitch-700">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white text-sm flex items-center gap-2"><Sello nombreComp={nombre} src={famSlug ? familiaSello(famSlug, nombre) : undefined} size={24} />{titulo}</span>
          <span className="text-xs text-chalk-600">{temp} · {grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</span>
        </div>
        {hist && (
          <p className="text-chalk-600 text-[length:var(--t-micro)] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Hasta 2023-24: {hist}
          </p>
        )}
      </div>
      <div className="px-4 py-2 flex flex-wrap gap-2">
        {grupos.length > 1 && (
          <Link
            href={`/madrid/aficionados/${grupos[0].slug_comp}/global/${temp}/jornada-${grupos[0].jornada_actual}/clasificacion`}
            className="text-xs bg-grass-500/15 hover:bg-grass-500 text-grass-300 hover:text-white px-3 py-1.5 rounded-md transition-colors border border-grass-500/30 font-semibold"
          >
            Global
          </Link>
        )}
        {grupos.map(g => {
          const esCopa = !!g.tipo && g.tipo !== 'LIGA'
          const entrada = esCopa ? 'resultados' : 'clasificacion'
          return (
          <Link
            key={g.codgrupo}
            href={`/madrid/aficionados/${g.slug_comp}/${g.slug_grupo}/${codToSlug(g.codtemporada)}/${esCopa ? segRondaActual(g) : `jornada-${g.jornada_actual}`}/${entrada}`}
            className="text-xs bg-pitch-700 hover:bg-grass-500 text-chalk-200 hover:text-white px-3 py-1.5 rounded-md transition-colors"
          >
            {esCopa ? `Ver competición · ${numRondas(g)} ronda${numRondas(g) === 1 ? '' : 's'}` : `${g.nombre_grupo} · J${g.jornada_actual}`}
          </Link>
        )})}
      </div>
    </div>
  )
}
