'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { tempLabel } from '@/lib/equipo'

// Estado de temporada seleccionada COMPARTIDO entre las pastillas + plantilla (columna principal) y el
// bloque "Top 5 de la plantilla" (aside). Preselección por ?temporada=YYYY-YY leída EN CLIENTE
// (la página de equipo sigue siendo ISR gracias al Suspense que envuelve al provider).
type Ctx = { sel: string; setSel: (t: string) => void; temporadas: string[] }
const TemporadaCtx = createContext<Ctx | null>(null)

export function useTemporada(): Ctx {
  const c = useContext(TemporadaCtx)
  if (!c) throw new Error('useTemporada fuera de TemporadaProvider')
  return c
}

export function TemporadaProvider({ temporadas, children }: { temporadas: string[]; children: ReactNode }) {
  const sp = useSearchParams()
  const param = sp.get('temporada')
  const [sel, setSel] = useState(temporadas.find((t) => tempLabel(t) === param) ?? temporadas[0])
  return <TemporadaCtx.Provider value={{ sel, setSel, temporadas }}>{children}</TemporadaCtx.Provider>
}
