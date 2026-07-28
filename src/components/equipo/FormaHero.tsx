import { fechaCortaDMY, diasDesdeDMY } from '@/lib/equipo'

// Forma del hero: 5 circulitos G/E/P (verde/gris/rojo), más reciente a la DERECHA, y debajo la racha
// "Última victoria · <fecha>" (+ "hace N días" solo si la temporada está en curso y es reciente).
const SIGNO_CLS: Record<'G' | 'E' | 'P', string> = { G: 'bg-grass-500', E: 'bg-chalk-600', P: 'bg-red-500' }
const SIGNO_TIT: Record<'G' | 'E' | 'P', string> = { G: 'Victoria', E: 'Empate', P: 'Derrota' }

export default function FormaHero({ forma, ultimaVictoria, tempEtiqueta, mostrarDias }: {
  forma: ('G' | 'E' | 'P')[]
  ultimaVictoria: { fecha: string | null; jornada: number } | null
  tempEtiqueta?: string | null   // inactivos: etiqueta de su última temporada
  mostrarDias?: boolean          // "hace N días" solo con la temporada en curso
}) {
  if (forma.length === 0) return null
  const dias = mostrarDias && ultimaVictoria ? diasDesdeDMY(ultimaVictoria.fecha) : null
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5">
        {tempEtiqueta && <span className="text-[11px] text-chalk-600 mr-1 tabular-nums">{tempEtiqueta}</span>}
        {forma.map((s, i) => (
          <span key={i} title={SIGNO_TIT[s]} className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SIGNO_CLS[s]}`} />
        ))}
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
