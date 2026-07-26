import Link from 'next/link'
import { formatNombre, jugadorHref } from '@/lib/jugador'

// Nombre de jugador en las tablas de ranking. Se convierte en enlace a su ficha SOLO si el
// codjugador está en `fichas` (el conjunto de códigos con ficha en web_jugador, resuelto por el
// fetcher del ranking). Sin `fichas` (rama juvenil) o sin ficha -> texto plano, jamás un enlace a 404.
export default function NombreJugador({
  codjugador, nombre, fichas,
}: {
  codjugador: string | number | null | undefined
  nombre: string | null
  fichas?: Set<string> | null
}) {
  // Nombre en MAYÚSCULAS en la UI (decisión de Fernando): el dato federativo sin acentos parece
  // tener faltas en title-case; en mayúsculas la omisión de acentos es tipográficamente correcta.
  // Transformación en render (uppercase); el dato y la metadata SEO siguen en title-case.
  const display = formatNombre(nombre)
  if (fichas && codjugador != null && fichas.has(String(codjugador))) {
    return (
      <Link
        href={jugadorHref(codjugador, nombre)}
        className="uppercase hover:text-grass-300 hover:underline decoration-grass-500/60 underline-offset-2 transition-colors"
      >
        {display}
      </Link>
    )
  }
  return <span className="uppercase">{display}</span>
}
