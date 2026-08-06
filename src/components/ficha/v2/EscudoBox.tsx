import EscudoImg from '@/components/EscudoImg'
import { escudoUrl } from '@/lib/supabase'

// Escudo como en el resto del sitio: caja blanca rounded, EscudoImg con su clase por defecto
// (w-full h-full object-contain) que se adapta al hueco. Devuelve null si NO hay escudo (evita cajas
// blancas vacías). `size` en px (proporción de la maqueta según el sitio de uso).
export default function EscudoBox({ escudo, nombre, size = 22, radius = 4 }: {
  escudo: string | null
  nombre?: string
  size?: number
  radius?: number
}) {
  if (!escudoUrl(escudo)) return null
  return (
    <span style={{
      width: size, height: size, borderRadius: radius, background: '#fff', padding: 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', verticalAlign: 'middle',
    }}>
      <EscudoImg escudo={escudo} nombre={nombre} />
    </span>
  )
}
