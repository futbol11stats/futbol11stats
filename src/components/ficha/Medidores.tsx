import { tempLabel } from '@/lib/jugador'
import { TrendingUp, Gauge } from 'lucide-react'

// Medidores de la ficha (spec v3): ELO con sparkline de cierre por temporada + máx histórico +
// percentil; rating F11S como anillo 0-100 con chip beta. El rating solo se pinta si existe; si no,
// el grid colapsa a una sola tarjeta a ancho completo con elegancia (grid-cols-1). Portero -> acento
// naranja en el aro del rating (coherente con la pastilla POR).

type Serie = { t: string; elo: number }

// Sparkline de la serie de ELO (cierre de cada temporada). SVG puro, sin librería.
function Sparkline({ serie }: { serie: Serie[] }) {
  if (serie.length < 2) return null
  const W = 100, H = 30, PAD = 3
  const vals = serie.map((s) => s.elo)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const x = (i: number) => (i / (serie.length - 1)) * W
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD)
  const pts = serie.map((s, i) => `${x(i).toFixed(1)},${y(s.elo).toFixed(1)}`)
  const line = pts.join(' ')
  const area = `0,${H} ${line} ${W},${H}`
  const lastX = x(serie.length - 1), lastY = y(serie[serie.length - 1].elo)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-8 mt-2" aria-hidden="true">
      <defs>
        <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22a050" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22a050" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#eloFill)" />
      <polyline points={line} fill="none" stroke="#22a050" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="2" fill="#2dc768" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function TarjetaElo({
  elo, eloMax, tempMax, percentil, serie,
}: {
  elo: number; eloMax: number | null; tempMax: string | null; percentil: number | null; serie: Serie[]
}) {
  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-chalk-600">
          <TrendingUp className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> ELO
        </span>
        {percentil != null && (
          <span className="text-[11px] font-medium text-grass-300 bg-grass-500/15 rounded px-1.5 py-0.5"
            title="Percentil de ELO dentro de su categoría actual (mayor es mejor)">
            Percentil {percentil}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold text-white tabular-nums">{Math.round(elo)}</span>
        {eloMax != null && (
          <span className="text-xs text-chalk-600">
            máx <span className="text-chalk-400 font-medium tabular-nums">{Math.round(eloMax)}</span>
            {tempMax ? ` · ${tempLabel(tempMax)}` : ''}
          </span>
        )}
      </div>
      <Sparkline serie={serie} />
    </div>
  )
}

function AnilloRating({ rating, portero }: { rating: number; portero: boolean }) {
  const R = 34, C = 2 * Math.PI * R
  const frac = Math.max(0, Math.min(100, rating)) / 100
  const dash = `${(C * frac).toFixed(1)} ${(C * (1 - frac)).toFixed(1)}`
  const color = portero ? '#f59e0b' : '#22a050'
  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 p-4 flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: 84, height: 84 }}>
        <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
          <circle cx="42" cy="42" r={R} fill="none" stroke="#142952" strokeWidth="7" />
          <circle cx="42" cy="42" r={R} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={dash} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-bold text-white tabular-nums">
          {rating}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-chalk-500" strokeWidth={2.5} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-chalk-600">Rating F11S</span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-amber-300 bg-amber-500/15 rounded px-1 py-px">beta</span>
        </div>
        <p className="text-xs text-chalk-600 mt-1 leading-snug">Índice compuesto de rendimiento sobre 100.</p>
      </div>
    </div>
  )
}

export default function Medidores({
  elo, eloMax, tempMax, percentil, serie, rating, portero,
}: {
  elo: number | null
  eloMax: number | null
  tempMax: string | null
  percentil: number | null
  serie: Serie[]
  rating: number | null
  portero: boolean
}) {
  const hayElo = elo != null
  const hayRating = rating != null
  if (!hayElo && !hayRating) return null
  // Colapsa a una columna si solo hay un medidor (spec: sin anillos vacíos).
  const cols = hayElo && hayRating ? 'sm:grid-cols-2' : 'sm:grid-cols-1'
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3`}>
      {hayElo && <TarjetaElo elo={elo!} eloMax={eloMax} tempMax={tempMax} percentil={percentil} serie={serie} />}
      {hayRating && <AnilloRating rating={rating!} portero={portero} />}
    </div>
  )
}
