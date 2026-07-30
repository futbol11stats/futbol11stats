import LigaPastilla from '@/components/LigaPastilla'
import { familiaCorto } from '@/lib/sellos'
import type { CopaEquipo } from '@/lib/equipo'

// Línea de COPAS de la temporada en curso (hero de equipo y de jugador). Cada copa renderiza con el
// MISMO componente que la pastilla de liga (LigaPastilla): "[sello] Copa RFEF · Eliminado en fase de
// grupos", enlazada a la vista de la copa. Sin copas -> no renderiza nada.
export default function CopasLinea({ copas, className = '' }: { copas: CopaEquipo[]; className?: string }) {
  if (!copas || copas.length === 0) return null
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {copas.map((c, i) => (
        <LigaPastilla key={i} nombreComp={c.nombre_comp} slugFamilia={c.slug_familia} segments={[familiaCorto(c.slug_familia, c.nombre_comp), c.estado]} href={c.href} />
      ))}
    </div>
  )
}
