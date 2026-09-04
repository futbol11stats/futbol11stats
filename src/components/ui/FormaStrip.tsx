import type { CSSProperties } from 'react'

// Tira de FORMA ÚNICA del sitio: los últimos N resultados como CUADRITO CON LETRA — G (ganó) / E (empató)
// / P (perdió) —, texto oscuro sobre color (verde/gris/rojo). Es el criterio ÚNICO de forma en todo el
// sitio (antes convivían dots en v2, cuadros con V/E/D en FormaHero y puntos en la clasificación). El
// tamaño se adapta al sitio (más pequeño en la columna de la clasificación). Acepta emojis del dato
// ('🟢🟡🔴') o letras ('G'/'E'/'P'). `titles` pone un tooltip por cuadro. Ver MANUAL_DE_ESTILO.md.
const SIG: Record<string, 'G' | 'E' | 'P'> = { '🟢': 'G', '🟡': 'E', '🔴': 'P', G: 'G', E: 'E', P: 'P' }
const COL: Record<'G' | 'E' | 'P', string> = { G: 'var(--e3)', E: 'var(--ink-3)', P: 'var(--e0)' }

export default function FormaStrip({
  items, size = 18, gap = 3, titles, className,
}: {
  items: readonly string[]
  size?: number
  gap?: number
  titles?: readonly (string | undefined)[]
  className?: string   // permite que el TAMAÑO responda al dispositivo por CSS: fija --fs-size en un media query
}) {
  if (!items?.length) return null
  // El lado del cuadro sale de la variable CSS --fs-size (si un contenedor la define, p. ej. por breakpoint) y cae
  // al `size` en píxeles si nadie la fija -> los usos con tamaño fijo (clasificación) siguen igual, y el hero puede
  // crecer en escritorio sin valores en línea que el CSS no pueda pisar. Radio y tipografía escalan con el lado.
  const sz = `var(--fs-size, ${size}px)`
  const chip: CSSProperties = {
    width: sz, height: sz, borderRadius: `max(3px, calc(${sz} * 0.27))`,
    display: 'grid', placeItems: 'center', flex: 'none',
    fontFamily: 'var(--font-display), "Barlow Condensed", sans-serif', fontWeight: 700,
    fontSize: `max(9px, calc(${sz} * 0.55))`, lineHeight: 1, color: '#0a1628',
  }
  return (
    <span className={className} style={{ display: 'inline-flex', gap, alignItems: 'center' }}>
      {items.map((raw, i) => {
        const s = SIG[raw]
        if (!s) return null
        return <span key={i} title={titles?.[i]} style={{ ...chip, background: COL[s] }}>{s}</span>
      })}
    </span>
  )
}
