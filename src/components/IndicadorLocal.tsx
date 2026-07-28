import { Home, Plane } from 'lucide-react'

// Indicador universal de local/visitante para filas de partido con rival SIN orden de equipos.
// Home = en casa · Plane = fuera. ~14px, tono chalk-600. FALLBACK: si esLocal es null/undefined
// (dato aún no exportado en las tablas de jugador) NO renderiza nada -> el caller decide (mantener
// "vs" textual o dejar el hueco). Cuando el dato aterrice, los iconos brotan solos.
export default function IndicadorLocal({ esLocal, className = '' }: { esLocal?: boolean | null; className?: string }) {
  if (esLocal == null) return null
  const Icon = esLocal ? Home : Plane
  const label = esLocal ? 'En casa' : 'Fuera'
  return (
    <span title={label} className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      <Icon className="w-3.5 h-3.5 text-chalk-600" strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
