import TeamName from '@/components/ui/TeamName'

// Nombre de equipo enlazado. Ahora delega en el componente ÚNICO TeamName: capitalización normal
// preservando siglas (C.F., S.A.D., 'A') y NUNCA truncar. Wrapper por compatibilidad con los sitios que
// ya lo importan. Ver MANUAL_DE_ESTILO.md.
export default function NombreEquipo({
  codequipo, nombre, className, temporada,
}: {
  codequipo: string | number | null | undefined
  nombre: string | null
  className?: string
  temporada?: string | null
}) {
  return (
    <TeamName
      cod={codequipo}
      raw={nombre}
      temporada={temporada}
      className={className ?? 'hover:text-grass-300 hover:underline decoration-grass-500/60 underline-offset-2 transition-colors'}
    />
  )
}
