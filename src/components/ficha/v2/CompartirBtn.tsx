'use client'

import { useState } from 'react'
import { Compartir } from '@/components/iconos'

// Botón de compartir (Web Share API o copia al portapapeles). Dos variantes de la maqueta:
// 'icon' -> cuadrado del hero (.share); 'btn' -> botón del pie (.btn.p).
export default function CompartirBtn({ titulo, variant = 'icon' }: { titulo: string; variant?: 'icon' | 'btn' }) {
  const [copiado, setCopiado] = useState(false)
  const onClick = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) { await (navigator as any).share({ title: titulo, url }); return }
      await navigator.clipboard.writeText(url)
      setCopiado(true); setTimeout(() => setCopiado(false), 1800)
    } catch { /* cancelado */ }
  }
  if (variant === 'btn') {
    return (
      <button type="button" className="btn p" onClick={onClick}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Compartir size={15} />{copiado ? '¡Enlace copiado!' : 'Compartir ficha'}
        </span>
      </button>
    )
  }
  return <button type="button" className="share" aria-label="Compartir" onClick={onClick}><Compartir size={17} /></button>
}
