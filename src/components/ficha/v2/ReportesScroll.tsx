'use client'

import { useEffect } from 'react'

// Ancla de navegación entre pestañas (móvil). La distinción es CÓMO SE LLEGA, no qué pestaña:
//   · ENTRADA EXTERNA (orgánico, enlace, buscador) = primera carga de la app -> NO se desplaza: la página
//     carga desde ARRIBA, con el panorama/líderes visibles.
//   · NAVEGACIÓN ENTRE PESTAÑAS (ya dentro de la ficha) -> se aterriza bajo la barra, en `#reportes-anchor`,
//     igual para TODAS las pestañas (incluida Clasificación).
// El flag es a NIVEL DE MÓDULO (no un ref ni estado): persiste entre navegaciones cliente aunque el
// componente se REMONTE en cada cambio de ruta, y se resetea solo en una recarga completa (= entrada
// externa). Así el primer render tras la carga no desplaza; cualquier navegación posterior sí. Solo móvil.
let yaNavegado = false

export default function ReportesScroll({ tab, land }: { tab: string; land: boolean }) {
  useEffect(() => {
    if (!yaNavegado) { yaNavegado = true; return }   // entrada externa (primera carga): no tocar el scroll
    if (!land) return
    if (typeof window === 'undefined' || window.innerWidth >= 1000) return
    const el = document.getElementById('reportes-anchor')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [tab, land])
  return null
}
