'use client'

import type { ReactNode } from 'react'
import { setComp, useComp } from './compStore'
import { ordenPorFechaOFase } from '@/lib/competiciones'

// Chips de competición de la barra de ámbito (cliente). Filtran el gráfico de jornadas y los subtítulos
// "echo" vía el store de módulo. El `sello` (badge de competición del sitio) se renderiza en servidor y
// se pasa como prop, igual que las pastillas de la cabecera.
export default function CompChips({ comps }: { comps: { label: string; count: number; sello?: ReactNode; titulo?: string; fase?: number; fechaInicio?: string | null }[] }) {
  const sel = useComp()
  const activo = Math.min(sel, comps.length - 1)
  // Orden de DISPLAY cronológico (por fecha_inicio si ambos la tienen; si no, por fase copa→liga→playoff),
  // conservando el índice ORIGINAL para setComp/activo: el espacio de índices (compartido con Jornadas/Nivel y el
  // default en índice 0) NO cambia, solo el orden visual. sort estable -> empates respetan el orden de entrada.
  const orden = comps.map((c, i) => ({ c, i })).sort((a, b) => ordenPorFechaOFase({ fechaInicio: a.c.fechaInicio, fase: a.c.fase ?? 0 }, { fechaInicio: b.c.fechaInicio, fase: b.c.fase ?? 0 }))
  return (
    <>
      {orden.map(({ c, i }) => (
        <a key={i} href="#s-jornadas" title={c.titulo || c.label} className={i === activo ? 'on' : ''} onClick={() => setComp(i)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {c.sello}
          <span className="cc-label">{c.label}</span>
          <span style={{ color: 'var(--ink-3)', fontWeight: 500, flex: 'none' }}>{c.count}</span>
        </a>
      ))}
    </>
  )
}
