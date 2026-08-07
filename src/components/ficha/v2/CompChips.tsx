'use client'

import type { ReactNode } from 'react'
import { setComp, useComp } from './compStore'

// Chips de competición de la barra de ámbito (cliente). Filtran el gráfico de jornadas y los subtítulos
// "echo" vía el store de módulo. El `sello` (badge de competición del sitio) se renderiza en servidor y
// se pasa como prop, igual que las pastillas de la cabecera.
export default function CompChips({ comps }: { comps: { label: string; count: number; sello?: ReactNode }[] }) {
  const sel = useComp()
  const activo = Math.min(sel, comps.length - 1)
  return (
    <>
      {comps.map((c, i) => (
        <a key={i} href="#s-jornadas" className={i === activo ? 'on' : ''} onClick={() => setComp(i)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {c.sello}
          <span>{c.label}</span>
          <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{c.count}</span>
        </a>
      ))}
    </>
  )
}
