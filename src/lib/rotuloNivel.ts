import { nombreCortoComp } from '@/lib/sellos'

// Rótulos de las filas de ranking del bloque Nivel (ficha de jugador). Las dos filas nombran la competición de la
// etapa seleccionada con el MISMO nombre (el corto si existe): la de categoría solo con él y la de posición
// detrás de la demarcación, «Delantero · Preferente».
export const rotuloCategoria = (nombreComp: string | null): string => nombreCortoComp(nombreComp)

export function rotuloPosicion(posLabel: string, nombreComp: string | null): string {
  const comp = rotuloCategoria(nombreComp)
  return comp ? `${posLabel} · ${comp}` : posLabel
}
