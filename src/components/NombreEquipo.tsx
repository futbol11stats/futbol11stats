import Link from 'next/link'
import { equipoHref } from '@/lib/equipo'

// Nombre de equipo enlazado a su ficha. Los equipos NO tienen perímetro de menores y web_equipo
// cubre el 100% de los codequipo que aparecen en el sitio (verificado), así que el enlace es
// incondicional: si falta el codequipo, cae a texto plano (sin romper el render).
export default function NombreEquipo({
  codequipo, nombre, className, temporada,
}: {
  codequipo: string | number | null | undefined
  nombre: string | null
  className?: string
  temporada?: string | null   // añade ?temporada=YYYY-YY para que la ficha de equipo abra en esa temporada
}) {
  const href = equipoHref(codequipo, nombre, temporada)
  if (!href || !nombre) return <>{nombre}</>
  return (
    <Link
      href={href}
      className={className ?? 'hover:text-grass-300 hover:underline decoration-grass-500/60 underline-offset-2 transition-colors'}
    >
      {nombre}
    </Link>
  )
}
