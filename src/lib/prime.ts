// PRIME — dónde está un jugador dentro de SU PROPIA horquilla histórica de ELO:
//
//   prime% = (elo − elo_min) / (elo_max − elo_min) × 100
//
// Horquilla 890-1.000 y hoy 945 → 50%: aunque nunca haya pasado de 1.000, está a mitad de su propio
// recorrido. Es un dato INDIVIDUAL — no compara contra nadie, solo contra sí mismo — y se autoajusta:
// si supera su máximo, ese pasa a ser el máximo y queda en 100.
//
// NO SE GUARDA EN NINGUNA TABLA: se deriva al pintar. Un porcentaje guardado se desincroniza del ELO del
// que sale en cuanto uno de los dos se recalcula y el otro no (la lección del escudo, ver memoria
// comentario-que-sobrevive-a-su-verdad).
//
// Devuelve null — y entonces no se pinta NADA, mismo criterio que el Rating F11S — cuando:
//   · la curva tiene menos de PRIME_N_MIN puntos: la horquilla todavía no significa nada;
//   · máximo y mínimo coinciden: no hay recorrido que medir (y la división sería por cero).
//
// `n` = elo_curva_n, los PUNTOS DE LA CURVA de ELO. NO son partidos jugados: la curva incluye copa y
// playoff, así que el número es algo mayor que los partidos de liga (p. ej. 184 frente a 182). Es el
// tamaño de muestra de la horquilla, que es justo lo que este gate mide — pero NO se puede rotular
// como "partidos" en ningún copy.
//
// Los argumentos son nullables a propósito: todas las columnas de Supabase pueden venir vacías y el
// gate debe ser "no hay dato → no se pinta", nunca un 0 inventado por un `?? 0` en la llamada.
export const PRIME_N_MIN = 5

export function calcPrime(
  elo: number | null | undefined,
  eloMin: number | null | undefined,
  eloMax: number | null | undefined,
  n: number | null | undefined,   // elo_curva_n: puntos de la curva, NO partidos
): number | null {
  if (elo == null || eloMin == null || eloMax == null) return null
  if ((n ?? 0) < PRIME_N_MIN) return null
  if (eloMax <= eloMin) return null
  const p = ((elo - eloMin) / (eloMax - eloMin)) * 100
  if (!Number.isFinite(p)) return null
  return Math.max(0, Math.min(100, p))
}
