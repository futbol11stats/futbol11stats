'use client'

import { useEffect, useState } from 'react'

// Barra de anclas sticky con scroll-spy DETERMINISTA (sin IntersectionObserver, que oscilaba entre dos
// secciones a la vez). En cada scroll se elige la ÚLTIMA sección (en orden de DOM) cuyo borde superior ya
// ha pasado la línea de disparo. Clave del layout de dos columnas: el aside es sticky (siempre visible),
// así que sus secciones (aside:true) NO cuentan para el activo en desktop -> el activo sigue al main.
export default function NavSpy({ secciones }: { secciones: { id: string; label: string; aside?: boolean }[] }) {
  const [activo, setActivo] = useState(secciones[0]?.id ?? '')

  useEffect(() => {
    const TRIGGER = 130 // px bajo el borde superior (debajo de la cabecera + nav sticky)
    let raf = 0
    const calc = () => {
      raf = 0
      const desktop = window.matchMedia('(min-width:1000px)').matches
      const elig = secciones.filter((s) => !(desktop && s.aside))
      let current = elig[0]?.id ?? ''
      for (const s of elig) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= TRIGGER) current = s.id
      }
      setActivo(current)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(calc) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    calc()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
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
