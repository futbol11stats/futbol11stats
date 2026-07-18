export const revalidate = 21600  // ISR 6h: los datos solo cambian al re-exportar desde el pipeline

import { supabase } from '@/lib/supabase'
import Link from 'next/link'

async function getCompeticiones() {
  const { data } = await supabase
    .from('web_grupos')
    .select('codtemporada, nombre_comp, nombre_grupo, codgrupo, categoria, jornada_actual, slug_comp, slug_grupo, tipo')
    .eq('codtemporada', 21)
    .order('nombre_comp')
  return data || []
}

const COMPETICION_ORDER = [
  // Aficionados
  '3ª RFEF Madrid',
  '1ª Autonómica Madrid',
  'Preferente Madrid',
  '1ª Aficionados Madrid',
  '2ª Aficionados Madrid',
  // Juveniles
  'Nacional Juvenil Madrid',
  '1ª Autonómica Juvenil Madrid',
  'Preferente Juvenil Madrid',
  '1ª Juvenil Madrid',
  '2ª Juvenil Madrid',
]

export default async function Home() {
  const grupos = await getCompeticiones()

  // Ordenar por número de grupo en cliente (evita orden alfabético tipo "Grupo 10" < "Grupo 2")
  grupos.sort((a, b) => {
    const numA = parseInt(a.nombre_grupo.replace(/\D/g, '')) || 0
    const numB = parseInt(b.nombre_grupo.replace(/\D/g, '')) || 0
    return numA - numB
  })

  const aficionados = grupos.filter(g => g.categoria === 'AFICIONADO')
  const juvenil = grupos.filter(g => g.categoria === 'JUVENIL')

  // Agrupar por competición
  const groupBy = (arr: typeof grupos) => {
    const map: Record<string, typeof grupos> = {}
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
            <div className="flex gap-3">
              <Link href="/madrid/aficionados" className="bg-grass-500 hover:bg-grass-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">
                Aficionados
              </Link>
              <Link href="/madrid/juveniles" className="bg-pitch-700 hover:bg-pitch-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm border border-pitch-600">
                Juvenil
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

function CompeticionCard({
  nombre,
  grupos,
  categoria,
}: {
  nombre: string
  grupos: { codgrupo: string; nombre_grupo: string; jornada_actual: number; slug_comp: string; slug_grupo: string; tipo?: string }[]
  categoria: string
}) {
  const nombreCorto: Record<string, string> = {
    '3ª RFEF Madrid': '3ª RFEF',
    '1ª Autonómica Madrid': '1ª Autonómica',
    'Preferente Madrid': 'Preferente',
    '1ª Aficionados Madrid': '1ª Aficionados',
    '2ª Aficionados Madrid': '2ª Aficionados',
    'Nacional Juvenil Madrid': 'Nacional Juvenil',
    '1ª Autonómica Juvenil Madrid': '1ª Autonómica',
    'Preferente Juvenil Madrid': 'Preferente',
    '1ª Juvenil Madrid': '1ª Juvenil',
    '2ª Juvenil Madrid': '2ª Juvenil',
  }

  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden hover:border-grass-500/50 transition-colors">
      <div className="px-4 py-3 border-b border-pitch-700 flex items-center justify-between">
        <span className="font-semibold text-white text-sm">{nombreCorto[nombre] || nombre}</span>
        <span className="text-xs text-chalk-600">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="px-4 py-2 flex flex-wrap gap-2">
        {grupos.length > 1 && (
          <Link
            href={`/madrid/${categoria}/${grupos[0].slug_comp}/global/2025-26/jornada-${grupos[0].jornada_actual}/clasificacion`}
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
            href={`/madrid/${categoria}/${g.slug_comp}/${g.slug_grupo}/2025-26/jornada-${g.jornada_actual}/${entrada}`}
            className="text-xs bg-pitch-700 hover:bg-grass-500 text-chalk-200 hover:text-white px-3 py-1.5 rounded-md transition-colors"
          >
            {esCopa ? `Ver competición · ${g.jornada_actual} rondas` : `${g.nombre_grupo} · J${g.jornada_actual}`}
          </Link>
        )})}
      </div>
    </div>
  )
}
