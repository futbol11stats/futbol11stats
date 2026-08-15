'use client'

import { useEffect } from 'react'
import { setComp } from './compStore'

// Resetea la competición seleccionada (compStore) al abrir cada ficha -> por defecto la INSTALADA (índice 0
// tras el reorden). El store es de módulo y persiste entre navegaciones cliente; sin esto, la ficha de un
// jugador arrancaría en la etapa que se pulsó en otro. `dep` = codjugador -> resetea al cambiar de ficha.
// Afecta también al gráfico de jornadas (comparten store), que es el criterio deseado.
export default function CompReset({ dep }: { dep: string }) {
  useEffect(() => { setComp(0) }, [dep])
  return null
}
