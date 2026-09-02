import Link from 'next/link'
import { equipoHref } from '@/lib/equipo'
import { nombreEquipo } from '@/lib/nombre'

// Nombre de equipo ÚNICO del sitio. Capitalización normal preservando siglas (C.F., S.A.D., 'A'), y NUNCA
// se trunca (el recorte con ellipsis desaparece). Enlaza a la ficha del equipo salvo que falte el código.
// Sustituye a NombreEquipo y a los truncados por CSS. Ver MANUAL_DE_ESTILO.md.
export default function TeamName({
  cod, raw, temporada, className,
}: {
  cod?: string | number | null
  raw: string | null
  temporada?: string | null
  className?: string
}) {
  const text = nombreEquipo(raw)
  const href = equipoHref(cod, raw, temporada)
  if (!href || !raw) return <span className={className}>{text}</span>
  return <Link href={href} className={className}>{text}</Link>
}
