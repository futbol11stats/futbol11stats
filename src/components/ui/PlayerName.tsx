import Link from 'next/link'
import { abreviaNombre, nombreCompleto } from '@/lib/nombre'
import { jugadorHref } from '@/lib/jugador'

// Nombre de jugador ÚNICO del sitio. Regla de oro: NUNCA se trunca; el formato por defecto (`compact`)
// abrevia el nombre de pila a inicial y deja los apellidos completos ("J. Barroso Sánchez"), de modo que
// cabe en cualquier columna sin puntos suspensivos. `full` = nombre completo (héroe/detalle). Capitalización
// normal siempre (nunca MAYÚSCULAS forzadas). Enlaza a la ficha si hay código con ficha (o `alwaysLink`).
// Sustituye a NombreJugador y a los formatNombre sueltos en la UI. Ver MANUAL_DE_ESTILO.md.
export default function PlayerName({
  raw, cod, fichas, alwaysLink, variant = 'compact', className,
}: {
  raw: string | null
  cod?: string | number | null
  fichas?: { has(key: string): boolean } | null
  alwaysLink?: boolean
  variant?: 'compact' | 'full'
  className?: string
}) {
  const text = variant === 'full' ? nombreCompleto(raw) : abreviaNombre(raw)
  const linkable = cod != null && (alwaysLink || (fichas ? fichas.has(String(cod)) : false))
  if (linkable) {
    return <Link href={jugadorHref(cod as string | number, raw)} className={className}>{text}</Link>
  }
  return <span className={className}>{text}</span>
}
