'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Carril horizontal con degradado en los bordes + flechas de navegación superpuestas, visibles solo cuando
// hay contenido en esa dirección y solo en desktop (el gesto táctil ya funciona en móvil). Extrae el patrón
// que ya usaban los gráficos de jornadas (Jornadas/JornadasEquipo) para reutilizarlo en cualquier carril:
// raíles de temporada/grupo/jornada/pestañas y la tabla de clasificación.
export default function ScrollRail({ children, className, wrapClassName, style }: {
  children: React.ReactNode; className?: string; wrapClassName?: string; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [fades, setFades] = useState({ l: false, r: false })
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    setFades({ l: el.scrollLeft > 4, r: el.scrollLeft < el.scrollWidth - el.clientWidth - 4 })
  }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    onScroll()
    const ro = new ResizeObserver(onScroll)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const nudge = (dir: -1 | 1) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }
  return (
    <div className={`srail-wrap${wrapClassName ? ` ${wrapClassName}` : ''}`} style={style}>
      <div className={`srail${className ? ` ${className}` : ''}`} ref={ref} onScroll={onScroll}>{children}</div>
      <div className="srail-fade srail-fade-l" style={{ opacity: fades.l ? 1 : 0 }} aria-hidden="true" />
      <div className="srail-fade srail-fade-r" style={{ opacity: fades.r ? 1 : 0 }} aria-hidden="true" />
      <button type="button" className="srail-nav srail-nav-l" aria-label="Desplazar a la izquierda"
        style={{ opacity: fades.l ? 1 : 0, pointerEvents: fades.l ? 'auto' : 'none' }} onClick={() => nudge(-1)}>
        <ChevronLeft size={18} strokeWidth={2.5} />
      </button>
      <button type="button" className="srail-nav srail-nav-r" aria-label="Desplazar a la derecha"
        style={{ opacity: fades.r ? 1 : 0, pointerEvents: fades.r ? 'auto' : 'none' }} onClick={() => nudge(1)}>
        <ChevronRight size={18} strokeWidth={2.5} />
      </button>
    </div>
  )
}
