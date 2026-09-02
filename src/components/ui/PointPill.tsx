import type { CSSProperties } from 'react'

// Pastilla de PUNTOS fantasy ÚNICA del sitio (antes: .m-pts, .pl-val, .rr .rv, .chip, .rsc). Cifra en
// Barlow, fondo coloreado por rendimiento (lo calcula quien la usa: colorFan / escala). Va SIEMPRE antes
// que el ELO (orden Puntos · ELO). null = no se pinta (silencio). Ver MANUAL_DE_ESTILO.md.
const BASE: CSSProperties = {
  fontFamily: 'var(--font-display), "Barlow Condensed", sans-serif',
  fontWeight: 700, fontSize: 'var(--n-sm)', lineHeight: 1, padding: '4px 9px',
  borderRadius: 6, color: '#08111f', display: 'inline-block', flex: 'none',
  fontVariantNumeric: 'tabular-nums',
}

export default function PointPill({
  value, bg, size = 'md', title,
}: {
  value: number | null | undefined
  bg?: string
  size?: 'sm' | 'md'
  title?: string
}) {
  if (value == null) return null
  const s: CSSProperties = size === 'sm'
    ? { ...BASE, fontSize: 'var(--t-cap)', padding: '3px 7px', borderRadius: 5 }
    : BASE
  return <span style={{ ...s, background: bg || 'var(--pitch-700)' }} title={title}>{value}</span>
}
