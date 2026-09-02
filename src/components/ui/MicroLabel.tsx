import type { CSSProperties, ReactNode } from 'react'

// Rótulo MICRO en mayúsculas ÚNICO del sitio (antes: ~8 clases + ~10 repeticiones Tailwind text-[11px]
// uppercase tracking-widest). Etiqueta de sección/columna/campo. Ver MANUAL_DE_ESTILO.md.
const BASE: CSSProperties = {
  fontSize: 'var(--t-micro)', textTransform: 'uppercase', letterSpacing: '.06em',
  color: 'var(--ink-3)', fontWeight: 700, lineHeight: 1.2,
}

export default function MicroLabel({
  children, style, className,
}: {
  children: ReactNode
  style?: CSSProperties
  className?: string
}) {
  return <span className={className} style={{ ...BASE, ...style }}>{children}</span>
}
