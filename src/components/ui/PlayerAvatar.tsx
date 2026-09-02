import type { CSSProperties, ReactNode } from 'react'
import { avaStyle } from '@/components/ficha/v2/jugadorFila'
import { inicialesNombre } from '@/lib/nombre'

// Pastilla de INICIALES del jugador, ÚNICA del sitio: cuadrado redondeado coloreado por demarcación
// (avaStyle) con las iniciales en Barlow. La MISMA en el héroe de la ficha de jugador y en el XI Óptimo
// (antes el XI usaba un círculo propio distinto). Ver MANUAL_DE_ESTILO.md.
//   · `size` fija dimensiones/tipografía en px (XI y usos con tamaño concreto).
//   · `className` (p.ej. "avatar") deja que el CSS controle el tamaño responsive (héroe: 70/100px).
//   · `children` para adornos absolutos (p.ej. el dorsal del héroe).
export default function PlayerAvatar({
  nombre, pos, size, className, style, children, label,
}: {
  nombre: string | null
  pos?: string | null
  size?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
  label?: ReactNode   // sustituye a las iniciales (p.ej. el DORSAL en la alineación de partido)
}) {
  const s: CSSProperties = {
    ...avaStyle(pos), display: 'grid', placeItems: 'center', position: 'relative', flex: 'none',
    fontFamily: 'var(--font-display), "Barlow Condensed", sans-serif', fontWeight: 700, lineHeight: 1,
  }
  if (size != null) {
    s.width = size; s.height = size
    s.borderRadius = Math.max(6, Math.round(size * 0.2))
    s.fontSize = Math.round(size * 0.42)
  }
  return <div className={className} style={{ ...s, ...style }}>{label ?? inicialesNombre(nombre)}{children}</div>
}
