import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import Sello from '@/components/Sello'

// Pastilla de LIGA del hero — MISMO componente en la ficha de equipo y en la de jugador (cero variantes):
// sello + competición · grupo · posición, enlazada a la vista del grupo. `muted` para inactivos.
export default function LigaPastilla({ nombreComp, grupoNombre, posicion, href, muted = false }: {
  nombreComp: string | null
  grupoNombre?: string | null
  posicion?: number | null
  href?: string | null
  muted?: boolean
}) {
  if (!nombreComp) return null
  const cls = muted
    ? 'bg-pitch-800 text-chalk-600 ring-1 ring-inset ring-pitch-700'
    : 'bg-grass-500/15 text-grass-300 ring-1 ring-inset ring-grass-400/25'
  const inner = (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${cls}`}>
      <Sello nombreComp={nombreComp} size={22} />
      {nombreComp}{grupoNombre ? ` · ${grupoNombre}` : ''}{posicion != null ? ` · ${posicion}º` : ''}
      {href && <ChevronRight className="w-3 h-3" />}
    </span>
  )
  return href ? <Link href={href} className="hover:brightness-125 transition inline-block">{inner}</Link> : inner
}
