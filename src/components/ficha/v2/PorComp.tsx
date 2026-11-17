'use client'

import type { ReactNode } from 'react'
import { useComp } from './compStore'

// Elige, entre nodos pre-renderizados en servidor (uno por competición, mismo orden que las pastillas), el de la
// competición seleccionada (compStore). Lo usa la cabecera de la ficha de jugador: chip de equipo y de
// competición/puesto siguen a la etapa del selector. `fallback` = temporada sin competiciones.
export default function PorComp({ nodos, fallback }: { nodos: ReactNode[]; fallback: ReactNode }) {
  const sel = useComp()
  return <>{nodos.length ? nodos[Math.min(sel, nodos.length - 1)] : fallback}</>
}
