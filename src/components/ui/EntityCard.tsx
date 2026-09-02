import Link from 'next/link'
import type { ReactNode } from 'react'

// Tarjeta-fila de DIRECTORIO ÚNICA del sitio: icono (escudo/inicial/MapPin) + título + subtítulo. Compartida
// por /clubes y /campos (eran gemelas pixel a pixel: solo cambiaba el icono). El filtro y la rejilla se
// quedan en cada listado. Ver MANUAL_DE_ESTILO.md.
export default function EntityCard({
  href, icon, title, subtitle,
}: {
  href: string
  icon: ReactNode
  title: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-2.5 rounded-lg bg-pitch-800 border border-pitch-700 hover:border-grass-500/50 transition-colors">
      {icon}
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white truncate">{title}</span>
        {subtitle != null && <span className="block text-xs text-chalk-600 truncate">{subtitle}</span>}
      </span>
    </Link>
  )
}
