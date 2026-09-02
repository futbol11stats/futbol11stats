import { POS_COLOR, POS_LABEL } from '@/lib/jugador'

// Pastilla de posición UNIVERSAL: badge coloreado por demarcación (POR/DEF/MED/DEL), con asterisco
// si la posición es estimada. `mini` para filas densas (tablas, buscador, movimientos), `normal`
// para bloques con aire (hero). Sin posición: guion neutro en normal; nada en mini.
export default function Pastilla({ pos, estimada, size = 'normal', className = '' }: {
  pos: string | null
  estimada?: boolean | null
  size?: 'mini' | 'normal'
  className?: string
}) {
  if (!pos) {
    if (size === 'mini') return null
    return (
      <span title="Posición no disponible"
        className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md text-sm font-bold bg-pitch-700 text-chalk-600 ${className}`}>
        –
      </span>
    )
  }
  const cls = POS_COLOR[pos] || 'bg-pitch-700 text-chalk-400'
  const dims = size === 'mini' ? 'px-1.5 py-0.5 rounded text-[length:var(--t-micro)]' : 'px-2.5 py-1 rounded-md text-sm'
  // font-body (Inter): la pastilla se ve IGUAL en todo el sitio, sin absorber la condensada de las tablas.
  return (
    <span title={estimada ? 'Posición estimada por dorsal' : (POS_LABEL[pos] || pos)}
      className={`flex-shrink-0 inline-flex items-center font-body font-bold ${dims} ${cls} ${className}`}>
      {pos}{estimada ? <span className="ml-px" aria-label="posición estimada">*</span> : null}
    </span>
  )
}
