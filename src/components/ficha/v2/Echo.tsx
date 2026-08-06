'use client'

import { useComp } from './compStore'

// Subtítulo "echo" de las secciones que dependen del ámbito: "2025-26 · <competición seleccionada>".
export default function Echo({ temporada, comps }: { temporada: string; comps: string[] }) {
  const sel = Math.min(useComp(), comps.length - 1)
  const comp = comps[sel] ?? comps[0] ?? ''
  return <>{temporada}{comp ? ` · ${comp}` : ''}</>
}
