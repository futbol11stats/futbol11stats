import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import Sello from '@/components/Sello'
import { colorPastilla, type AcentoPastilla } from '@/lib/sellos'

// Pastilla de competición — ÚNICO origen de estilo para liga Y copa (hero de equipo y de jugador).
// Sello + segmentos unidos por " · " en condensada, opcional enlace. El acento de color sale del
// nombre (liga -> verde; Copa RFEF -> azul; Final 1ª Autonómica -> verde; Copa RFFM -> rojo).
//   Liga:  segments=["3ª RFEF", "Grupo 7", "11º"]
//   Copa:  segments=["Copa RFEF", "Eliminado en fase de grupos"]
const TONO: Record<AcentoPastilla | 'muted', string> = {
  verde: 'bg-grass-500/15 text-grass-300 ring-1 ring-inset ring-grass-400/25',
  azul:  'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/30',
  rojo:  'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30',
  muted: 'bg-pitch-800 text-chalk-600 ring-1 ring-inset ring-pitch-700',
}

export default function LigaPastilla({ nombreComp, segments, href, muted = false }: {
  nombreComp: string | null
  segments: (string | null | undefined)[]
  href?: string | null
  muted?: boolean
}) {
  const parts = segments.filter((s): s is string => !!s)
  if (!nombreComp && parts.length === 0) return null
  const cls = TONO[muted ? 'muted' : colorPastilla(nombreComp)]
  const inner = (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-display font-semibold tracking-tight ${cls}`}>
      <Sello nombreComp={nombreComp} size={26} />
      <span>{parts.join(' · ')}</span>
      {href && <ChevronRight className="w-3.5 h-3.5" />}
    </span>
  )
  return href ? <Link href={href} className="hover:brightness-125 transition inline-block">{inner}</Link> : inner
}
