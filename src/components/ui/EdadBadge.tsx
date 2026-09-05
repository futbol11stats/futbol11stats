import type { BadgeEdad } from '@/lib/badgeEdad'

// Pastilla de CATEGORÍA DE EDAD (Juvenil / Sub-23) — MISMO tratamiento que la Pastilla de posición, en el AZUL
// del sistema (--zona-po). Excluyente; `null` no pinta nada. El texto (no el color) distingue el tramo. Es un
// hecho de categoría, nunca una fecha. QUIÉN la usa decide el criterio: IDENTIDAD (cabecera de jugador) -> edad
// de HOY; REGISTRO histórico (fila de plantilla de una temporada) -> edad de esa temporada. Ver src/lib/badgeEdad.ts.
export default function EdadBadge({ badge, size = 'normal' }: { badge: BadgeEdad; size?: 'mini' | 'normal' }) {
  if (!badge) return null
  const label = badge === 'juvenil' ? 'Juvenil' : 'Sub-23'
  const dims = size === 'mini' ? 'px-1.5 py-0.5 rounded text-[length:var(--t-micro)]' : 'px-2.5 py-1 rounded-md text-sm'
  return (
    <span
      title={`${label} en esta temporada (por año de nacimiento)`}
      className={`flex-shrink-0 inline-flex items-center font-body font-bold ${dims}`}
      style={{ background: 'var(--zona-po)', color: '#08111f' }}
    >
      {label}
    </span>
  )
}
