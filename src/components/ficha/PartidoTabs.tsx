'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import ScrollRail from '@/components/ficha/v2/ScrollRail'

// Pestañas de la ficha de PARTIDO. A diferencia de las de competición (que son RUTAS con <Link>), aquí son
// un toggle DENTRO de la misma página (un partido es una sola URL). Regla clave de SEO: el contenido de TODAS
// las pestañas se renderiza en el HTML (server) y se OCULTA por CSS (`hidden` -> display:none) — nunca render
// condicional — para no perder posicionamiento. Mismo tratamiento visual que las pestañas de competición
// (.verrail + borde inferior verde en la activa; ver .fpv2 .ptabs en ficha.css). El ScrollRail añade el
// degradado + flechas cuando no caben a 390px, así que "hay más pestañas" se ve solo. Ver MANUAL_DE_ESTILO.md.

export type PartidoTab = { id: string; label: string; show: boolean; panel: ReactNode }

export default function PartidoTabs({ tabs }: { tabs: PartidoTab[] }) {
  const vis = tabs.filter((t) => t.show)
  const [active, setActive] = useState(vis[0]?.id)
  if (vis.length === 0) return null
  const activo = vis.some((t) => t.id === active) ? active : vis[0].id
  return (
    <>
      <div className="tabs ptabs" id="ptab-anchor">
        <div className="verrow">
          <ScrollRail><div className="verrail">
            {vis.map((t) => (
              <button key={t.id} type="button" className={t.id === activo ? 'on' : ''} onClick={() => setActive(t.id)}>{t.label}</button>
            ))}
          </div></ScrollRail>
        </div>
      </div>
      {vis.map((t) => (
        <div key={t.id} className="ptab-panel" hidden={t.id !== activo}>{t.panel}</div>
      ))}
    </>
  )
}
