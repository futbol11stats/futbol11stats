'use client'

import { useEffect, useState, type ReactNode } from 'react'

// Un ÚNICO enlace de calendario cuyo destino se elige por plataforma (sin un segundo enlace visible):
//   - Apple (iPhone/iPad/Mac): `appleHref` -> webcal:// (suscripción nativa) o el .ics (importar el evento).
//   - Resto (Android/escritorio, mayoría de nuestro público): `otherHref` -> Google Calendar (crear evento /
//     añadir por URL), que se abre ya relleno con un toque.
// SSR y primer render usan `otherHref` (Android es la mayoría) -> sin desajuste de hidratación; en Apple se
// intercambia tras montar. Todo el contenido (icono + texto) es el enlace.
export default function CalendarLink({ appleHref, otherHref, className, children }: {
  appleHref: string; otherHref: string; className?: string; children: ReactNode
}) {
  const [href, setHref] = useState(otherHref)
  useEffect(() => {
    const ua = navigator.userAgent || ''
    const isApple = /iPad|iPhone|iPod/.test(ua)
      || /Macintosh/.test(ua)
      || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1)
    setHref(isApple ? appleHref : otherHref)
  }, [appleHref, otherHref])
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}
