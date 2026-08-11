'use client'

import { useEffect } from 'react'

// Navegación en móvil: al seleccionar una pestaña (o al entrar por enlace directo a una pestaña distinta
// de la de por defecto), desplaza suavemente hasta que el bloque "Reportes de" quede arriba, con el
// contenido justo debajo (el panorama queda accesible subiendo). Solo en móvil; en la pestaña por defecto
// no hace nada, para no forzar scroll en la entrada normal. Depende de `tab` para reaccionar a CADA cambio
// de pestaña (navegación cliente), no solo al primer montaje.
export default function ReportesScroll({ tab, land }: { tab: string; land: boolean }) {
  useEffect(() => {
    if (!land) return
    if (typeof window === 'undefined' || window.innerWidth >= 1000) return
    const el = document.getElementById('reportes-anchor')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [tab, land])
  return null
}
