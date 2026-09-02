import type { CSSProperties } from 'react'

// Δ ELO del partido ÚNICO del sitio (antes: .m-elo, .pl-elo, inline sueltos). Verde si sube, rojo si baja,
// signo +/−. Va SIEMPRE después de los puntos (orden Puntos · ELO). null = no se pinta (silencio genuino,
// nunca un 0 inventado). Ver MANUAL_DE_ESTILO.md.
const BASE: CSSProperties = {
  fontFamily: 'var(--font-display), "Barlow Condensed", sans-serif',
  fontWeight: 700, fontVariantNumeric: 'tabular-nums', flex: 'none',
}

export default function EloDelta({
  value, size = 'md',
}: {
  value: number | null | undefined
  size?: 'sm' | 'md'
}) {
  if (value == null) return null
  const up = value >= 0
  return (
    <span
      style={{ ...BASE, fontSize: size === 'sm' ? 'var(--t-cap)' : 'var(--n-sm)', color: up ? 'var(--e3)' : 'var(--e0)' }}
      title="Δ ELO del partido"
    >{up ? '+' : '−'}{Math.abs(Math.round(value))}</span>
  )
}
