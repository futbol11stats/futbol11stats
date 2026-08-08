import EscudoImg from '@/components/EscudoImg'
import { escudoUrl } from '@/lib/supabase'

// Escudo como en el resto del sitio: caja blanca rounded, EscudoImg con su clase por defecto
// (w-full h-full object-contain) que se adapta al hueco. Devuelve null si NO hay escudo (evita cajas
// blancas vacías). `size` en px (proporción de la maqueta según el sitio de uso).
// El padding es PROPORCIONAL al tamaño (~9%, como el p-1.5 del escudo grande de la ficha actual): con
// 1px fijo un escudo casi cuadrado tocaba el borde y sus esquinas asomaban del marco redondeado. Se
// puede forzar con la prop `pad`. `overflow:hidden` garantiza que nada sobresalga del marco.
export default function EscudoBox({ escudo, nombre, size = 22, radius = 4, pad }: {
  escudo: string | null
  nombre?: string
  size?: number
  radius?: number
  pad?: number
}) {
  if (!escudoUrl(escudo)) return null
  const padding = pad ?? Math.max(1, Math.round(size * 0.09))
  return (
    <span style={{
      width: size, height: size, borderRadius: radius, background: '#fff', padding, overflow: 'hidden',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', verticalAlign: 'middle',
    }}>
      <EscudoImg escudo={escudo} nombre={nombre} />
    </span>
  )
}
