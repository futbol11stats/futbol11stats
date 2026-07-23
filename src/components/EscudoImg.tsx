'use client'

import { escudoUrl, escudoThumbUrl } from '@/lib/supabase'

// Escudo de equipo: sirve la MINIATURA WebP (128px) generada por el pipeline y, si no existe
// todavía (escudo nuevo sin thumb), hace fallback al PNG original vía onError — nunca rompe el
// render. loading="lazy" + width/height explícitos para evitar CLS. No usa next/image a propósito:
// en Hobby la optimización runtime tiene cuotas y las thumbs precalculadas la hacen innecesaria.
export default function EscudoImg({
  escudo,
  nombre,
  className = 'w-full h-full object-contain',
}: {
  escudo: string | null
  nombre?: string
  className?: string
}) {
  const original = escudoUrl(escudo)
  if (!original) return null
  const thumb = escudoThumbUrl(escudo) ?? original
  return (
    <img
      src={thumb}
      alt={nombre ? `Escudo ${nombre}` : 'Escudo del equipo'}
      loading="lazy"
      width={128}
      height={128}
      className={className}
      onError={(e) => {
        const img = e.currentTarget
        if (img.dataset.fb) return // evita bucle si el original también falla
        img.dataset.fb = '1'
        img.src = original
      }}
    />
  )
}
