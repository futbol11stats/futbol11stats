'use client'

import { useEffect, useRef } from 'react'

// Carril de scroll horizontal sin barra visible. El ocultado del scrollbar va con styled-jsx (scoped)
// para no depender de reglas globales: `scrollbar-width:none` (Firefox), `::-webkit-scrollbar{display:none}`
// (WebKit/Blink) y `-webkit-overflow-scrolling:touch` (inercia en iOS).
// `autoCentrarActivo`: al montar, centra el hijo con [data-activo="true"] dentro del propio carril.
export default function Track({
  children,
  className = '',
  autoCentrarActivo = false,
}: {
  children: React.ReactNode
  className?: string
  autoCentrarActivo?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!autoCentrarActivo || !ref.current) return
    const activo = ref.current.querySelector('[data-activo="true"]')
    activo?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [autoCentrarActivo])

  return (
    <>
      <div ref={ref} className={`track ${className}`}>
        {children}
      </div>
      <style jsx>{`
        .track {
          display: flex;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .track::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  )
}
