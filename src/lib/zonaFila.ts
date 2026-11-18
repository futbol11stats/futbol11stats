// Zona con la que se pinta una fila de la clasificación de liga. RETIRADO: la del pipeline decide. Con zona
// (descenso_directo) se pinta de descenso como siempre (la retirada ES el descenso); con la zona VACÍA (categoría sin
// descensos, p. ej. 2ª Aficionada) va sin color de zona, solo con el rótulo RETIRADO.
export const zonaDeFila = (retirado: boolean | null | undefined, zona: string | null | undefined): string | null =>
  retirado ? (zona ? 'descenso_directo' : null) : (zona ?? null)
