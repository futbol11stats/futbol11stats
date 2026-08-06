'use client'

import { setComp, useComp } from './compStore'

// Chips de competición de la barra de ámbito (cliente). Filtran el gráfico de jornadas y los subtítulos
// "echo" vía el store de módulo. Si al cambiar de temporada el índice queda fuera de rango, se ignora.
export default function CompChips({ comps }: { comps: { label: string; count: number }[] }) {
  const sel = useComp()
  const activo = Math.min(sel, comps.length - 1)
  return (
    <>
      {comps.map((c, i) => (
        <a key={i} href="#s-jornadas" className={i === activo ? 'on' : ''} onClick={() => setComp(i)}>
          {c.label}{' '}
          <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{c.count}</span>
        </a>
      ))}
    </>
  )
}
