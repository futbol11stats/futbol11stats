import { tempLabel } from '@/lib/equipo'
import { ShieldCheck } from 'lucide-react'
import Badge11 from '@/components/ui/Badge11'

// Medidores de la ficha de equipo (misma familia que la de jugador): ELO con sparkline de cierre por
// temporada + máx histórico, y Deportividad (puesto de juego limpio del grupo + TA·TR). Si no hay ELO
// el grid colapsa a una tarjeta.

type Serie = { t: string; elo: number }

function Sparkline({ serie }: { serie: Serie[] }) {
  if (serie.length < 2) return null
  const W = 100, H = 30, PAD = 3
  const vals = serie.map((s) => s.elo)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const x = (i: number) => (i / (serie.length - 1)) * W
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD)
  const line = serie.map((s, i) => `${x(i).toFixed(1)},${y(s.elo).toFixed(1)}`).join(' ')
  const lastX = x(serie.length - 1), lastY = y(serie[serie.length - 1].elo)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-8 mt-2" aria-hidden="true">
      <defs>
        <linearGradient id="eloFillEq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22a050" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22a050" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="url(#eloFillEq)" />
      <polyline points={line} fill="none" stroke="#22a050" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="2" fill="#2dc768" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function MedidoresEquipo({
  elo, eloMax, tempMax, serie, juegoLimpio, ta, td, tr,
}: {
  elo: number | null
  eloMax: number | null
  tempMax: string | null
  serie: Serie[]
  juegoLimpio: number | null
  ta: number | null
  td: number | null
  tr: number | null
}) {
  const hayElo = elo != null
  const cols = hayElo ? 'sm:grid-cols-2' : 'sm:grid-cols-1'
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3`}>
      {hayElo && (
        <div className="bg-pitch-800 rounded-xl border border-pitch-700 p-4">
          <span className="flex items-center gap-1.5 text-[length:var(--t-micro)] font-semibold uppercase tracking-wider text-chalk-600">
            <Badge11 size={14} /> ELO
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-white tabular-nums">{Math.round(elo!)}</span>
            {eloMax != null && (
              <span className="text-xs text-chalk-600">
                máx <span className="text-chalk-400 font-medium tabular-nums">{Math.round(eloMax)}</span>
                {tempMax ? ` · ${tempLabel(tempMax)}` : ''}
              </span>
            )}
          </div>
          <Sparkline serie={serie} />
        </div>
      )}

      <div className="bg-pitch-800 rounded-xl border border-pitch-700 p-4">
        <span className="flex items-center gap-1.5 text-[length:var(--t-micro)] font-semibold uppercase tracking-wider text-chalk-600">
          <ShieldCheck className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Deportividad
        </span>
        {juegoLimpio != null ? (
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xs text-chalk-600">Juego limpio</span>
            <span className="font-display text-3xl font-bold text-white tabular-nums">#{juegoLimpio}</span>
            <span className="text-xs text-chalk-600">del grupo</span>
          </div>
        ) : (
          <div className="mt-1.5 font-display text-2xl font-bold text-chalk-500">—</div>
        )}
        {/* Amarillas · dobles · rojas por separado: la doble amarilla ya no se suma a las rojas. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5 text-chalk-500">
            <span className="inline-block w-3 h-4 rounded-[2px] bg-amber-400" /> {ta ?? 0} <span className="text-chalk-600">amarillas</span>
          </span>
          <span className="flex items-center gap-1.5 text-chalk-500">
            <span className="inline-block w-3 h-4 rounded-[2px] bg-amber-400/60 ring-1 ring-inset ring-red-500/40" /> {td ?? 0} <span className="text-chalk-600">dobles</span>
          </span>
          <span className="flex items-center gap-1.5 text-chalk-500">
            <span className="inline-block w-3 h-4 rounded-[2px] bg-red-500" /> {tr ?? 0} <span className="text-chalk-600">rojas</span>
          </span>
        </div>
      </div>
    </div>
  )
}
