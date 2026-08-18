'use client'

import { useState, type ReactNode } from 'react'

// Máquina del tiempo de la clasificación de FASE DE GRUPOS de copa. Recibe los snapshots ya renderizados en
// servidor (uno por matchday, mismo orden que `matchdays`) y muestra el seleccionado; por defecto el último.
// La URL NO cambia: el segmento sigue siendo la ronda. Con un solo matchday no pinta selector.
export default function MatchdaySelector({ matchdays, children }: { matchdays: number[]; children: ReactNode[] }) {
  const [sel, setSel] = useState(Math.max(0, matchdays.length - 1))
  if (matchdays.length === 0) return null
  const i = Math.min(sel, children.length - 1)
  return (
    <>
      {matchdays.length > 1 && (
        <div className="md-sel">
          {matchdays.map((j, k) => (
            <button key={j} type="button" className={k === sel ? 'on' : ''} onClick={() => setSel(k)}>Jornada {j}</button>
          ))}
        </div>
      )}
      {children[i]}
    </>
  )
}
