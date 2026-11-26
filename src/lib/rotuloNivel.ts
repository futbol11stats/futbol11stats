import { nombreCortoComp } from '@/lib/sellos'

// Rótulos de las filas de ranking del bloque Nivel (ficha de jugador). Las dos filas nombran la competición de la
// etapa seleccionada con el MISMO nombre (el corto si existe): la de categoría solo con él y la de posición en una
// segunda línea bajo la demarcación («Delantero» / «Preferente»): en una sola línea se cortaba en la columna de 360 px.
export const rotuloCategoria = (nombreComp: string | null): string => nombreCortoComp(nombreComp)

export function rotuloPosicion(posLabel: string, nombreComp: string | null): { label: string; sub: string | null } {
  return { label: posLabel, sub: rotuloCategoria(nombreComp) || null }
}
