import { fechaCortaDMY, diasDesdeDMY, type ChipRacha } from '@/lib/equipo'
import FormaStrip from '@/components/ui/FormaStrip'

// Racha del hero (equipo y jugador, mismo componente): micro-etiqueta "RACHA" + la tira de forma ÚNICA del
// sitio (FormaStrip: cuadrito con letra G/E/P, más reciente a la DERECHA), con tooltip "Jnn · marcador vs
// Rival" por cuadro. El equipo añade debajo "Última victoria · <fecha>"; el jugador pasa la miga.

export default function FormaHero({ forma, ultimaVictoria, tempEtiqueta, mostrarDias, miga }: {
  forma: ChipRacha[]
  ultimaVictoria: { fecha: string | null; jornada: number } | null
  tempEtiqueta?: string | null   // inactivos: etiqueta de su última temporada
  mostrarDias?: boolean          // "hace N días" solo con la temporada en curso
  miga?: string | null           // jugador: "últimos 5 · reciente →" (el equipo no la usa)
}) {
  if (!forma || forma.length === 0) return null
  const dias = mostrarDias && ultimaVictoria ? diasDesdeDMY(ultimaVictoria.fecha) : null
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[length:var(--t-micro)] font-semibold uppercase tracking-widest text-chalk-600">Racha</span>
        {tempEtiqueta && <span className="text-[length:var(--t-micro)] text-chalk-600 tabular-nums">{tempEtiqueta}</span>}
        <FormaStrip
          items={forma.map((c) => c.signo)}
          titles={forma.map((c) => `${c.jornada != null ? `J${c.jornada} · ` : ''}${c.marcador}${c.rival ? ` vs ${c.rival}` : ''}`)}
          size={20}
        />
        {miga && <span className="text-[length:var(--t-micro)] text-chalk-600">{miga}</span>}
      </div>
      {ultimaVictoria && (
        <p className="text-[length:var(--t-micro)] text-chalk-600 mt-1.5">
          Última victoria · {fechaCortaDMY(ultimaVictoria.fecha)}
          {dias != null && dias >= 0 && dias <= 45 ? ` · hace ${dias} ${dias === 1 ? 'día' : 'días'}` : ''}
        </p>
      )}
    </div>
  )
}
