// ORDEN de competiciones en los índices (Home, /madrid/aficionados, /madrid/juveniles). Fuente ÚNICA
// (antes duplicado en las tres páginas). Criterio (Fernando): cada liga seguida de sus copas/finales/
// play-off. Lo no listado cae al final por orden alfabético (lo resuelve cada página). Con el modelo de
// FAMILIA, cada copa es UNA entrada (nombre_comp de la familia), no una por ronda/final suelta.
export const ORDEN_AFICIONADOS = [
  '3ª RFEF Madrid',
  'Copa RFEF Fase Autonómica',
  'Play Off Tercera Federación',
  '1ª Autonómica Madrid',
  'Copa Primera División Autonómica Aficionado',
  'Preferente Madrid',
  '1ª Aficionados Madrid',
  '2ª Aficionados Madrid',
  'Copa de Aficionados RFFM',
]

export const ORDEN_JUVENILES = [
  'Nacional Juvenil Madrid',
  '1ª Autonómica Juvenil Madrid',
  'Copa Primera División Autonómica Juvenil',
  'Preferente Juvenil Madrid',
  '1ª Juvenil Madrid',
  '2ª Juvenil Madrid',
]

// FASE 3 — modelo de FAMILIA de copas. Las 5 familias (slug estable entre temporadas).
export const FAMILIA_SLUGS = new Set([
  'copa-rfef', 'copa-rffm', 'playoff-tercera',
  'copa-primera-division-autonomica-aficionado', 'copa-primera-division-autonomica-juvenil',
])

// Slugs VIEJOS por competición/ronda suelta (incluidos los que llevan el año o "final" separado) ->
// familia canónica. 308 a la familia. Derivado del JSONB de honores (slug_comp -> slug_familia). No se
// incluye 'copa-rffm' (es a la vez slug de familia -> se renderiza, no redirige).
export const OLD_A_FAMILIA: Record<string, string> = {
  'copa-rfef-fase-autonomica': 'copa-rfef',
  'final-copa-rfef-fase-autonomica': 'copa-rfef',
  'final-copa-rffm': 'copa-rfef',
  'play-off-tercera-federacion': 'playoff-tercera',
  'play-off-tercera-rfef': 'playoff-tercera',
  'copa-de-aficionados-rffm-2025-2026': 'copa-rffm',
  'copa-de-aficionados-rffm-temp-24-25': 'copa-rffm',
  'copa-rffm-preferente-aficionados': 'copa-rffm',
  'fase-final-copa-de-aficionados-rffm': 'copa-rffm',
  'final-copa-rffm-categoria-preferente-afi': 'copa-rffm',
  'final-copa-rffm-preferente-aficionado': 'copa-rffm',
  'final-copa-rffm-preferente-aficionados': 'copa-rffm',
  'campeon-de-madrid-categoria-preferente-a': 'copa-primera-division-autonomica-aficionado',
  'copa-campeon-categoria-preferente': 'copa-primera-division-autonomica-aficionado',
  'copa-rffm-primera-division-autonomica-af': 'copa-primera-division-autonomica-aficionado',
  'final-copa-1-division-autonomica-aficion': 'copa-primera-division-autonomica-aficionado',
  'final-copa-primera-division-autonomica-a': 'copa-primera-division-autonomica-aficionado',
  'campeon-de-madrid-primera-division-auton': 'copa-primera-division-autonomica-juvenil',
  'copa-juveniles-primera-division-autonomi': 'copa-primera-division-autonomica-juvenil',
  'final-campeon-primera-division-autonomic': 'copa-primera-division-autonomica-juvenil',
  'final-copa-1-division-autonomica-juvenil': 'copa-primera-division-autonomica-juvenil',
}

// ¿Es un slug VIEJO de copa (a redirigir / a ocultar en índices)? El slug de familia NO lo es.
export const esViejaCopa = (slugComp: string): boolean =>
  !!OLD_A_FAMILIA[slugComp] && !FAMILIA_SLUGS.has(slugComp)

// FASE cronológica de una competición dentro de una temporada, para ORDENAR por el calendario real (mismo
// criterio en ficha de equipo y de jugador): copa de pretemporada (0) -> LIGA (1) -> PLAYOFF (2), la fase
// final que se juega cuando la liga ya terminó. La liga se reconoce por tener `categoria_nivel` (nivel de la
// pirámide); copa y playoff lo traen NULL, y el playoff se distingue del resto de copas por el nombre. Se usa
// como clave de sort (estable: dentro de una misma fase se respeta el orden de origen).
export function faseCompeticion(nombreComp: string | null | undefined, categoriaNivel: number | null | undefined): number {
  if (categoriaNivel != null) return 1
  return /play\s*off/i.test(nombreComp || '') ? 2 : 0
}

// Comparador de orden CRONOLÓGICO dentro de una temporada: por `fechaInicio` (ISO YYYY-MM-DD, primer partido de
// la competición) si AMBOS elementos la tienen; si falta en alguno, cae en la FASE (regla por tipo). La ficha de
// equipo ya trae fecha_inicio (web_equipo_temporadas + JSONB de copas); la de jugador caerá en fase hasta que el
// re-export publique la columna en web_jugador_carrera -> se afinará sola, sin tocar código.
export function ordenPorFechaOFase(
  a: { fechaInicio?: string | null; fase: number },
  b: { fechaInicio?: string | null; fase: number },
): number {
  if (a.fechaInicio && b.fechaInicio) return a.fechaInicio.localeCompare(b.fechaInicio)
  return a.fase - b.fase
}

// slug_grupo de cada familia: el play-off es 'playoff'; el resto, 'copa'. (Para construir el destino
// del 308 sin consultar la BD.)
export const familiaSlugGrupo = (familySlug: string): string =>
  familySlug === 'playoff-tercera' ? 'playoff' : 'copa'

// Leyenda "Hasta 2023-24: <nombre antiguo>" del índice. Para las FAMILIAS de copa el web_grupos.nombre_historico
// es RUIDO (nombres de la ronda suelta por temporada) -> daba leyendas al revés. Corrección de dominio
// (Fernando): la categoría se renombró "Preferente" -> "Autonómica" en 2024-25, así que SOLO las dos Copa
// 1ª Autonómica tuvieron renombre real; el resto de familias no -> sin leyenda. Las LIGAS conservan su
// nombre_historico del dato (que sí es correcto). Devuelve el nombre antiguo, o null para no mostrar leyenda.
const HISTORICO_COPA: Record<string, string | null> = {
  // Solo el AFICIONADO cambió "Preferente" -> "Autonómica" (2024-25). El JUVENIL fue "Autonómica" en
  // TODAS las temporadas (dato de Fernando) -> sin leyenda. El resto de familias tampoco se renombraron.
  'Copa Primera División Autonómica Aficionado': 'Copa Primera División Preferente Aficionado',
  'Copa Primera División Autonómica Juvenil': null,
  'Copa RFEF Fase Autonómica': null,
  'Copa de Aficionados RFFM': null,
  'Play Off Tercera Federación': null,
}
export function historicoLegenda(nombreComp: string, nombreHistoricoDB?: string | null): string | null {
  if (nombreComp in HISTORICO_COPA) return HISTORICO_COPA[nombreComp]
  return nombreHistoricoDB ?? null
}

export type Ronda = { n: number; idx: number; slug: string; label: string }

// Segmento [jornada] de la ronda/jornada ACTUAL de un grupo (para enlaces de índices y navegación):
// en copa por familia, el slug de la ronda por defecto (la jornada_actual); en liga, jornada-N.
export function segRondaActual(grupo: { tipo?: string | null; jornada_actual: number; rondas?: unknown }): string {
  const rondas: Ronda[] = grupo.tipo && grupo.tipo !== 'LIGA' && Array.isArray(grupo.rondas) ? (grupo.rondas as Ronda[]) : []
  if (!rondas.length) return `jornada-${grupo.jornada_actual}`
  const d = rondas.find((r) => r.idx === grupo.jornada_actual) || rondas[rondas.length - 1]
  return d ? d.slug : `jornada-${grupo.jornada_actual}`
}

// Nº de rondas de una copa (para "N rondas" en los índices). Fallback a jornada_actual.
export const numRondas = (grupo: { jornada_actual: number; rondas?: unknown }): number =>
  Array.isArray(grupo.rondas) ? (grupo.rondas as unknown[]).length : grupo.jornada_actual
