import { selloDe, selloNecesitaCirculo } from '@/lib/sellos'

// Sello federativo de una competición. `size` en px (mini ~16-18 en tablas/chips; ~24-28 en cabeceras).
// Si el logo lo necesita, círculo blanco detrás (como los escudos de club) para contrastar en oscuro.
export default function Sello({ nombreComp, src: srcOverride, size = 18, className = '' }: { nombreComp: string | null; src?: string; size?: number; className?: string }) {
  const src = srcOverride ?? selloDe(nombreComp)
  const circle = selloNecesitaCirculo(src)
  const pad = circle ? Math.max(1, Math.round(size * 0.1)) : 0
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 align-middle ${circle ? 'bg-white rounded-full' : ''} ${className}`}
      style={{ width: size, height: size, padding: pad }}
      aria-hidden="true"
    >
      <img src={src} alt="" loading="lazy" className="max-w-full max-h-full object-contain" />
    </span>
  )
}
