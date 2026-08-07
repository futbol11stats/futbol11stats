// Sparkline de la serie de ELO (cierre de cada temporada). SVG puro, sin librería. Mismo dibujo que el
// de la ficha actual (Medidores): se extrae aquí para reutilizarlo también en la /v2 sin tocar Medidores.
type Serie = { t: string; elo: number }

export default function EloSparkline({ serie, className = 'w-full h-8 mt-2' }: { serie: Serie[]; className?: string }) {
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
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="eloFillV2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22a050" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22a050" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#eloFillV2)" />
      <polyline points={line} fill="none" stroke="#22a050" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="2" fill="#2dc768" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
