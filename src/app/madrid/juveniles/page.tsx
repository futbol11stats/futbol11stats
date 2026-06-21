import { supabase } from '@/lib/supabase'
import Link from 'next/link'

async function getGrupos() {
  const { data } = await supabase
    .from('web_grupos')
    .select('codtemporada, nombre_comp, nombre_grupo, codgrupo, categoria, jornada_actual')
    .eq('categoria', 'JUVENIL')
    .eq('codtemporada', 21)
    .order('nombre_comp')
    .order('nombre_grupo')
  return data || []
}

// nombre_historico solo está poblado en T17-T19; mapeamos nombre_comp -> nombre_historico
async function getHistoricoMap() {
  const { data } = await supabase
    .from('web_grupos')
    .select('nombre_comp, nombre_historico')
    .not('nombre_historico', 'is', null)
  const map: Record<string, string> = {}
  for (const g of data || []) {
    if (g.nombre_historico) map[g.nombre_comp] = g.nombre_historico
  }
  return map
}

const COMPETICION_ORDER = [
  'Nacional Juvenil Madrid',
  '1ª Autonómica Juvenil Madrid',
  'Preferente Juvenil Madrid',
  '1ª Juvenil Madrid',
  '2ª Juvenil Madrid',
]

export default async function JuvenilPage() {
  const [grupos, historicoMap] = await Promise.all([getGrupos(), getHistoricoMap()])

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
        <span className="text-white">Juvenil</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <p className="text-grass-400 text-xs font-semibold uppercase tracking-widest mb-1">
          Categoría
        </p>
        <h1 className="font-display text-4xl font-bold text-white flex items-center gap-3">
          <span className="w-1.5 h-9 bg-amber-500 rounded-full inline-block" />
          Juvenil
        </h1>
        <p className="text-chalk-600 text-sm mt-2">
          {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · Temporada 2025-26
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
  grupos: { codgrupo: string; nombre_grupo: string; jornada_actual: number }[]
  nombreHistorico?: string
}) {
  const nombreCorto: Record<string, string> = {
    'Nacional Juvenil Madrid': 'Nacional Juvenil',
    '1ª Autonómica Juvenil Madrid': '1ª Autonómica',
    'Preferente Juvenil Madrid': 'Preferente',
    '1ª Juvenil Madrid': '1ª Juvenil',
    '2ª Juvenil Madrid': '2ª Juvenil',
  }

  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden hover:border-grass-500/50 transition-colors">
      <div className="px-4 py-3 border-b border-pitch-700">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white text-sm">{nombreCorto[nombre] || nombre}</span>
          <span className="text-xs text-chalk-600">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</span>
        </div>
        {nombreHistorico && (
          <p className="text-chalk-600 text-[11px] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Hasta 2023-24: {nombreHistorico}
          </p>
        )}
      </div>
      <div className="px-4 py-2 flex flex-wrap gap-2">
        {grupos.map(g => (
          <Link
            key={g.codgrupo}
            href={`/madrid/juveniles/${g.codgrupo}`}
            className="text-xs bg-pitch-700 hover:bg-grass-500 text-chalk-200 hover:text-white px-3 py-1.5 rounded-md transition-colors"
          >
            {g.nombre_grupo} · J{g.jornada_actual}
          </Link>
        ))}
      </div>
    </div>
  )
}
