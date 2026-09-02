'use client'

import { useEffect, useRef } from 'react'

// Ancla de navegación entre pestañas (móvil). La distinción es CÓMO SE LLEGA, no qué pestaña:
//   · ENTRADA EXTERNA (orgánico, enlace, buscador) = primer montaje -> NO se desplaza: la página carga
//     desde ARRIBA, con el panorama/líderes visibles.
//   · NAVEGACIÓN ENTRE PESTAÑAS (cambia `tab`, incluida Clasificación) -> se aterriza bajo la barra, en
//     `#reportes-anchor`, igual para todas.
// Solo en móvil (<1000). El ref se salta el efecto del primer montaje; a partir de ahí, cada cambio de
// pestaña (navegación cliente, el componente persiste) sí desplaza.
export default function ReportesScroll({ tab, land }: { tab: string; land: boolean }) {
  const montado = useRef(false)
  useEffect(() => {
    if (!montado.current) { montado.current = true; return }   // entrada externa: no tocar el scroll
    if (!land) return
    if (typeof window === 'undefined' || window.innerWidth >= 1000) return
    const el = document.getElementById('reportes-anchor')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [tab, land])
  return null
}
