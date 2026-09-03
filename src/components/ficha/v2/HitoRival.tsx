import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'

// Rival de un hito (mayor_goleada…): " · vs {escudo} {nombre} {resultado}". El nombre se RE-CAPITALIZA vía
// NombreEquipo (rival_nombre llega CRUDO del pipeline, en mayúsculas RFFM) y enlaza a la ficha del rival por
// rival_cod — mismo tratamiento que actuaciones/partidos. Solo se pinta cuando el pipeline pobló rival_cod; si
// no, el hito usa su `detalle` de siempre (regla de transición, deploy independiente del re-export).
export default function HitoRival({ cod, nombre, escudo, resultado }: {
  cod: string | null; nombre: string | null; escudo: string | null; resultado: string | null
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
      {' · vs '}
      <EscudoBox escudo={escudo} nombre={nombre ?? undefined} size={15} radius={3} />
      <NombreEquipo codequipo={cod} nombre={nombre} />
      {resultado ? ` ${resultado}` : ''}
    </span>
  )
}
