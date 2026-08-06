'use client'

import { useSyncExternalStore } from 'react'

// Store mínimo de módulo para compartir la competición seleccionada entre islas cliente separadas
// (chips de la barra de ámbito arriba y gráfico de jornadas abajo), sin envolver todo en un provider.
let comp = 0
const subs = new Set<() => void>()

export function setComp(i: number) {
  if (i === comp) return
  comp = i
  subs.forEach((f) => f())
}
export function getComp() {
  return comp
}
function subscribe(f: () => void) {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}
export function useComp(): number {
  return useSyncExternalStore(subscribe, getComp, getComp)
}
