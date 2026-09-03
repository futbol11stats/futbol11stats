import type { ReactNode } from 'react'
import ScrollRail from '@/components/ficha/v2/ScrollRail'
import ReportesScroll from '@/components/ficha/v2/ReportesScroll'

// Barra de pestañas-RUTA de la ficha de competición (grupo y global). Unifica el bloque `.tabs` que estaba
// inline y casi calcado en ambas: ReportesScroll (sticky) + las tres filas .modo / .jrow / .verrow, cada una
// con su `.sel-lbl` y (jornada/ver) su ScrollRail + raíl. Lo único que difiere entre las dos fichas son los
// hrefs de los `<Link>`, que se pasan por slots. El CSS vive en ficha.css (.fjv2/.fcv2 .tabs …).
//
// OJO: esto son pestañas = RUTAS (navegación entre vistas de la competición). NO es NavSpy (scroll-spy de
// jugador/equipo, misma página) ni MatchdaySelector (toggle de snapshot): conceptos distintos, no van aquí.
// Ver MANUAL_DE_ESTILO.md.

export type TabBarProps = {
  tab: string                 // pestaña activa (para ReportesScroll)
  land: boolean               // ReportesScroll: si aterriza (scroll al ancla) al entrar
  modo: ReactNode             // los dos enlaces de modo (Jornada / Temporada)
  modoLabel?: string          // rótulo de la fila modo (por defecto "Reportes de")
  jornadaLabel: ReactNode     // rótulo de la fila de jornadas ("Jornada" / "Acumulado hasta" / ronda)
  jornadas: ReactNode         // enlaces de jornada/ronda (TabBar los envuelve en ScrollRail + .jbar-rail)
  ver: ReactNode              // enlaces de las pestañas-ruta (TabBar los envuelve en ScrollRail + .verrail)
  verLabel?: string           // por defecto "Ver"
}

export default function TabBar({ tab, land, modo, modoLabel = 'Reportes de', jornadaLabel, jornadas, ver, verLabel = 'Ver' }: TabBarProps) {
  return (
    <>
      <ReportesScroll tab={tab} land={land} />
      <div className="tabs" id="reportes-anchor">
        <div className="modo">
          <div className="sel-lbl">{modoLabel}</div>
          {modo}
        </div>
        <div className="jrow">
          <div className="sel-lbl">{jornadaLabel}</div>
          <ScrollRail><div className="jbar-rail">{jornadas}</div></ScrollRail>
        </div>
        <div className="verrow">
          <div className="sel-lbl">{verLabel}</div>
          <ScrollRail><div className="verrail">{ver}</div></ScrollRail>
        </div>
      </div>
    </>
  )
}
