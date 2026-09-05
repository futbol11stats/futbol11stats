import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreJugador from '@/components/NombreJugador'
import Pastilla from '@/components/Pastilla'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import EloDelta from '@/components/ui/EloDelta'
import EdadBadge from '@/components/ui/EdadBadge'
import type { BadgeEdad } from '@/lib/badgeEdad'
import { escudoUrl, formatNombre } from '@/lib/supabase'
import { abreviaNombre, nombreEquipo as fmtEquipo, nombreCompleto } from '@/lib/nombre'

// Fila de jugador ÚNICA del sitio (clases .pl). Unifica las 5 reimplementaciones previas: top plantilla y
// ranking (con escudo o avatar), plantilla por líneas, alineación de partido (dorsal + eventos + ΔELO) y
// cuerpo técnico. Usa los átomos: PlayerAvatar (pastilla del héroe), PlayerName (NombreJugador), Pastilla,
// EloDelta. El valor (.pl-val) es la pastilla de puntos; el `meta` es el contenido libre de la línea de datos
// (eventos con minuto / stats / equipo). Reflow: móvil = meta bajo el nombre; escritorio = meta en línea
// rellenando el centro (no se estira dejando hueco). Ver MANUAL_DE_ESTILO.md.
export type PlayerRowProps = {
  rank?: ReactNode
  rankColor?: string
  cod?: string | number | null       // codjugador -> enlace por NombreJugador
  nombre: string
  pos?: string | null
  posEstimada?: boolean
  escudo?: string | null             // si lo hay, sustituye al avatar (rankings multi-club)
  dorsal?: ReactNode                 // alineación: número en el avatar en vez de iniciales
  equipo?: string | null             // nombre de equipo en la línea de datos
  meta?: ReactNode                   // eventos/stats libres (.pl-me)
  valor?: ReactNode                  // pastilla de puntos (.pl-val)
  valorStyle?: CSSProperties         // fondo/tinta del valor (por defecto verde --e2)
  elo?: number | null                // ΔELO del partido (alineación)
  fichas?: { has(k: string): boolean } | null
  href?: string | null               // enlace directo del nombre (alineación: j.href ya calculado)
  nombreCompletoUI?: boolean         // nombre completo (cuerpo técnico) en vez de abreviado
  muted?: boolean                    // .pl-nojugo (no jugó)
  hidden?: boolean                   // .pl-hid (oculto por defecto en el desplegable de plantilla)
  tec?: boolean                      // cuerpo técnico (.pl-tec)
  pastilla?: boolean                 // mostrar la Pastilla de posición (por defecto sí; la plantilla por líneas no)
  badgeEdad?: BadgeEdad              // categoría de edad por temporada (Juvenil/Sub-23); junto a la posición
}

export default function PlayerRow({
  rank, rankColor, cod, nombre, pos, posEstimada, escudo, dorsal, equipo, meta,
  valor, valorStyle, elo, fichas, href, nombreCompletoUI, muted, hidden, tec, pastilla, badgeEdad,
}: PlayerRowProps) {
  const personaEq = equipo ? `${formatNombre(nombre)} en ${equipo}` : formatNombre(nombre)
  const cls = `pl${tec ? ' pl-tec' : ''}${muted ? ' pl-nojugo' : ''}${hidden ? ' pl-hid' : ''}`
  const texto = nombreCompletoUI ? nombreCompleto(nombre) : abreviaNombre(nombre)
  const nombreNode = href
    ? <Link href={href}>{texto}</Link>
    : cod != null
      ? <NombreJugador codjugador={cod} nombre={nombre} fichas={fichas} />
      : texto
  return (
    <div className={cls}>
      {rank != null && <div className="pl-rk" style={rankColor ? { color: rankColor } : undefined}>{rank}</div>}
      {escudoUrl(escudo ?? null)
        ? <span className="pl-esc" title={personaEq}><EscudoBox escudo={escudo ?? null} nombre={equipo ?? undefined} altText={personaEq} size={34} radius={8} /></span>
        : <PlayerAvatar className="pl-av" nombre={nombre} pos={pos} label={dorsal ?? undefined} />}
      <div className="pl-mid">
        <div className="pl-nm">{nombreNode}</div>
        {(pos || equipo || meta || badgeEdad) && (
          <div className="pl-me">
            {pos && pastilla !== false && <Pastilla pos={pos} size="mini" estimada={posEstimada} />}
            {badgeEdad && <EdadBadge badge={badgeEdad} size="mini" />}
            {equipo && <span className="pl-eq">{fmtEquipo(equipo)}</span>}
            {meta}
          </div>
        )}
      </div>
      {valor != null && <div className="pl-val" style={valorStyle ?? { background: 'var(--e2)' }}>{valor}</div>}
      {elo != null && <div className="pl-elo"><EloDelta value={elo} /></div>}
    </div>
  )
}
