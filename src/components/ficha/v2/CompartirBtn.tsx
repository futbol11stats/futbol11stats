'use client'

import { useState } from 'react'
import { Compartir } from '@/components/iconos'

// Botón de compartir: Web Share API nativa si existe; si no, copia la URL al portapapeles. Sin estado
// de servidor, sin dependencias. `label` opcional para el pie (texto visible).
export default function CompartirBtn({ titulo, label, className = '' }: { titulo: string; label?: string; className?: string }) {
  const [copiado, setCopiado] = useState(false)

  const onClick = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: titulo, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      /* cancelado por el usuario o sin permisos: no hacemos nada */
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Compartir"
      className={`inline-flex items-center gap-1.5 text-chalk-500 hover:text-white transition-colors ${className}`}
      style={{ fontSize: 'var(--t-cap)' }}
    >
      <Compartir size={16} />
      {label && <span>{copiado ? '¡Enlace copiado!' : label}</span>}
    </button>
  )
}
