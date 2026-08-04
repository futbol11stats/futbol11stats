'use client'

import { useEffect, useState } from 'react'
import Track from './Track'

// Barra sticky de anclas con scroll-spy. La sección activa se calcula con IntersectionObserver
// (rootMargin recorta 50px por arriba y 68% por abajo, así "activa" la sección cuya cabecera entra en
// la franja superior de la ventana). Los enlaces son anclas reales href="#id": no hay navegación por
// estado de cliente, sólo se resalta el activo.
export default function SectionNav({ secciones }: { secciones: { id: string; label: string }[] }) {
  const [activo, setActivo] = useState<string>(secciones[0]?.id ?? '')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setActivo(e.target.id)
        }
      },
      { rootMargin: '-50px 0px -68% 0px' }
    )
    for (const s of secciones) {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [secciones])

  return (
    <nav className="sticky top-16 z-40 border-b border-pitch-700 bg-pitch-900/90 backdrop-blur-sm">
      <Track autoCentrarActivo className="gap-1 px-3 py-2">
        {secciones.map((s) => {
          const on = activo === s.id
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-activo={on ? 'true' : 'false'}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors ${
                on ? 'bg-grass-500 text-white' : 'text-chalk-600 hover:text-white'
              }`}
            >
              {s.label}
            </a>
          )
        })}
      </Track>
    </nav>
  )
}
