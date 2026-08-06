import Track from '@/components/ui/Track'
import SeasonCard from '@/components/ui/SeasonCard'
import { PALETA_TEXTO, escalon, CORTES_FIJOS } from '@/lib/escala'
import { tempLabel } from '@/lib/jugador'
import type { CarreraRow } from '@/lib/jugadorV2'

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('es-ES')
const claseMedia = (m: number | null) => (m == null ? 'text-chalk-500' : PALETA_TEXTO[escalon(m, CORTES_FIJOS.mediaPartido)])
// ELO de las tarjetas: cortes FIJOS (evita una query de percentil por etapa). Ver DECISIONES-PENDIENTES (D6).
const claseElo = (e: number | null) => (e == null ? 'text-chalk-500' : PALETA_TEXTO[escalon(e, CORTES_FIJOS.elo)])

// Sección Temporadas (TODAS LAS TEMPORADAS): carrusel de SeasonCard, una tarjeta por ETAPA (no por año);
// si compartió temporada con dos equipos, salen dos con marca de temporada compartida. El escudo no se
// pinta: SeasonCard no tiene ranura para él (ver DECISIONES-PENDIENTES D7); el equipo va en el subtítulo.
export default function Temporadas({ carrera }: { carrera: CarreraRow[] }) {
  const cuenta = new Map<string, number>()
  for (const c of carrera) cuenta.set(c.codtemporada, (cuenta.get(c.codtemporada) ?? 0) + 1)

  return (
    <Track className="gap-3 pb-1">
      {carrera.map((c, i) => {
        const compartida = (cuenta.get(c.codtemporada) ?? 0) > 1
        return (
          <div key={`${c.codtemporada}-${c.codequipo}-${i}`} className="w-[230px] flex-shrink-0">
            <SeasonCard
              titulo={tempLabel(c.codtemporada)}
              subtitulo={c.equipo_nombre || c.nombre_comp || ''}
              cifras={[
                { valor: c.media_fantasy != null ? c.media_fantasy.toFixed(2) : '—', etiqueta: 'Media', className: claseMedia(c.media_fantasy) },
                { valor: c.elo_final != null ? String(Math.round(c.elo_final)) : '—', etiqueta: 'ELO', className: claseElo(c.elo_final) },
              ]}
              stats={[
                { valor: num(c.pj), etiqueta: 'PJ' },
                { valor: num(c.minutos), etiqueta: 'MIN' },
                { valor: num(c.goles), etiqueta: 'Goles' },
              ]}
              franja={{ texto: compartida ? `${c.nombre_comp || ''} · misma temporada` : (c.nombre_comp || ''), tono: 'neutro' }}
            />
          </div>
        )
      })}
    </Track>
  )
}
