import PlayerName from '@/components/ui/PlayerName'

// Nombre de jugador en tablas/rankings. Ahora delega en el componente ÚNICO PlayerName: regla del sitio
// (inicial + apellidos, Title Case, NUNCA truncar), enlace a la ficha SOLO si el código está en `fichas`.
// Se mantiene este wrapper por compatibilidad con los ~11 sitios que ya lo importan; internamente es
// PlayerName. Ver MANUAL_DE_ESTILO.md.
export default function NombreJugador({
  codjugador, nombre, fichas,
}: {
  codjugador: string | number | null | undefined
  nombre: string | null
  fichas?: { has(key: string): boolean } | null
}) {
  return (
    <PlayerName
      raw={nombre}
      cod={codjugador}
      fichas={fichas}
      className="hover:text-grass-300 hover:underline decoration-grass-500/60 underline-offset-2 transition-colors"
    />
  )
}
