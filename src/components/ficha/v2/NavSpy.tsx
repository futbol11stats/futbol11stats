'use client'

import { useEffect, useState } from 'react'

// Barra de anclas sticky con scroll-spy (IntersectionObserver, mismo rootMargin que la maqueta).
export default function NavSpy({ secciones }: { secciones: { id: string; label: string }[] }) {
  const [activo, setActivo] = useState(secciones[0]?.id ?? '')
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => { if (e.isIntersecting) setActivo(e.target.id) }),
      { rootMargin: '-50px 0px -68% 0px' }
    )
    secciones.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [secciones])
  return (
    <div className="nav">
      <div className="track"><div className="rail">
        {secciones.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={activo === s.id ? 'on' : ''}>{s.label}</a>
        ))}
      </div></div>
    </div>
  )
}
