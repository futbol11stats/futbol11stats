'use client'

import { useEffect, useRef } from 'react'

// Fila de tabs deslizable en móvil (una sola línea). Al montar, centra el tab activo
// ([data-active="true"]) en el eje horizontal moviendo SOLO el scroll del contenedor, nunca el de
// la página. En desktop (md+) el contenedor vuelve a flex-wrap y esto no hace nada visible.
export default function TabScroller({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const active = el.querySelector('[data-active="true"]') as HTMLElement | null
    if (active) {
      el.scrollLeft = active.offsetLeft - el.clientWidth / 2 + active.clientWidth / 2
    }
  }, [])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
