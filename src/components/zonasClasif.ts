import type { CSSProperties } from 'react'

// Colores de ZONA de la tabla de clasificación (ascenso/playoff/descenso/filial). Único resto vivo del
// antiguo tablas.tsx: lo consume FichaCompeticionV2 para pintar el fondo de cada fila y su leyenda. El
// resto de tablas.tsx (las ~13 tablas de pestaña pre-v2) era código muerto y se retiró — la ficha de
// competición v2 las sustituyó por rankings de barras (RankingComp) + clasificación inline.

export const ZONA_BG: Record<string, CSSProperties> = {
  ascenso_directo:      { backgroundColor: 'rgb(20,83,45)',   borderLeft: '4px solid rgb(34,197,94)'  },
  playoff_ascenso:      { backgroundColor: 'rgb(78,53,0)',    borderLeft: '4px solid rgb(234,179,8)'  },
  ascenso_arrastre:     { backgroundColor: 'rgb(60,40,0)',    borderLeft: '4px solid rgb(234,179,8)'  },
  descenso_directo:     { backgroundColor: 'rgb(83,20,20)',   borderLeft: '4px solid rgb(239,68,68)'  },
  descenso_coeficiente: { backgroundColor: 'rgb(60,15,15)',   borderLeft: '4px solid rgba(239,68,68,0.6)'  },
  descenso_arrastre:    { backgroundColor: 'rgb(60,15,15)',   borderLeft: '4px solid rgba(239,68,68,0.6)'  },
  filial_bloqueado:     { backgroundColor: 'rgb(30,58,138)',  borderLeft: '4px solid rgb(59,130,246)'  },
}

export const ZONA_LEYENDA: { tipo: string; label: string }[] = [
  { tipo: 'ascenso_directo',      label: 'Ascenso directo' },
  { tipo: 'playoff_ascenso',      label: 'Playoff ascenso' },
  { tipo: 'ascenso_arrastre',     label: 'Ascenso por arrastre' },
  { tipo: 'descenso_directo',     label: 'Descenso directo' },
  { tipo: 'descenso_coeficiente', label: 'Descenso por coeficiente' },
  { tipo: 'descenso_arrastre',    label: 'Descenso por arrastre' },
  { tipo: 'filial_bloqueado',     label: 'Filial bloqueado (no puede ascender)' },
]

// Zonas que dependen del resultado final; solo se muestran en las 2 últimas jornadas.
export const ARRASTRE_TIPOS = new Set(['descenso_arrastre', 'ascenso_arrastre', 'descenso_coeficiente', 'filial_bloqueado'])
