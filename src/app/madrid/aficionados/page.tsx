import { supabase } from '@/lib/supabase'
import Link from 'next/link'

async function getGrupos() {
  const { data } = await supabase
    .from('web_grupos')
    .select('codtemporada, nombre_comp, nombre_grupo, codgrupo, categoria, jornada_actual')
    .eq('categoria', 'AFICIONADO')
    .eq('codtemporada', 21)
    .order('nombre_comp')
  return data || []
}

const COMPETICION_ORDER = [
  'TERCERA FEDERACION RFEF',
  'PRIMERA DIVISION AUTONOMICA',
  'PREFERENTE',
  'PRIMERA',
  'SEGUNDA',
]

export default async function AficionadosPage() {
  const grupos = await getGrupos()

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
          {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · Temporada 2025-26
        </p>
      </div>

      {/* Competiciones */}
      <div className="space-y-3">
        {ordenadas.map(comp => (
          <CompeticionCard key={comp} nombre={comp} grupos={map[comp]} />
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
}: {
  nombre: string
  grupos: { codgrupo: string; nombre_grupo: string; jornada_actual: number }[]
}) {
  const nombreCorto: Record<string, string> = {
    'TERCERA FEDERACION RFEF': '3ª RFEF',
    'PRIMERA DIVISION AUTONOMICA': '1ª Autonómica',
    'PREFERENTE': 'Preferente',
    'PRIMERA': '1ª Aficionada',
    'SEGUNDA': '2ª Aficionada',
  }

  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden hover:border-grass-500/50 transition-colors">
      <div className="px-4 py-3 border-b border-pitch-700 flex items-center justify-between">
        <span className="font-semibold text-white text-sm">{nombreCorto[nombre] || nombre}</span>
        <span className="text-xs text-chalk-600">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="px-4 py-2 flex flex-wrap gap-2">
        {grupos.map(g => (
          <Link
            key={g.codgrupo}
            href={`/madrid/aficionados/${g.codgrupo}`}
            className="text-xs bg-pitch-700 hover:bg-grass-500 text-chalk-200 hover:text-white px-3 py-1.5 rounded-md transition-colors"
          >
            {g.nombre_grupo} · J{g.jornada_actual}
          </Link>
        ))}
      </div>
    </div>
  )
}
