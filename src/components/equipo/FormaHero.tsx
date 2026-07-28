import { fechaCortaDMY, diasDesdeDMY, type ChipRacha } from '@/lib/equipo'

// Racha del hero (equipo y jugador, mismo componente): micro-etiqueta "RACHA" + 5 cuadraditos con
// LETRA — V (victoria, césped) / E (empate, pizarra) / D (derrota, rojo) — más reciente a la DERECHA.
// Cada chip lleva tooltip "Jnn · marcador vs Rival" (título + aria-label). El equipo añade debajo
// "Última victoria · <fecha>"; el jugador pasa la miga "últimos 5 · reciente →".
const CHIP: Record<'G' | 'E' | 'P', { letra: string; cls: string }> = {
  G: { letra: 'V', cls: 'bg-grass-500 text-white' },
  E: { letra: 'E', cls: 'bg-pitch-600 text-chalk-200' },   // gris pizarra
  P: { letra: 'D', cls: 'bg-red-500 text-white' },
}

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
        <span className="text-[10px] font-semibold uppercase tracking-widest text-chalk-600">Racha</span>
        {tempEtiqueta && <span className="text-[11px] text-chalk-600 tabular-nums">{tempEtiqueta}</span>}
        <div className="flex items-center gap-1">
          {forma.map((c, i) => {
            const cfg = CHIP[c.signo]
            const tip = `${c.jornada != null ? `J${c.jornada} · ` : ''}${c.marcador}${c.rival ? ` vs ${c.rival}` : ''}`
            return (
              <span key={i} title={tip} aria-label={tip}
                className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 font-display font-semibold text-[11px] leading-none ${cfg.cls}`}>
                {cfg.letra}
              </span>
            )
          })}
        </div>
        {miga && <span className="text-[10px] text-chalk-600">{miga}</span>}
      </div>
      {ultimaVictoria && (
        <p className="text-[11px] text-chalk-600 mt-1.5">
          Última victoria · {fechaCortaDMY(ultimaVictoria.fecha)}
          {dias != null && dias >= 0 && dias <= 45 ? ` · hace ${dias} ${dias === 1 ? 'día' : 'días'}` : ''}
        </p>
      )}
    </div>
  )
}
