// Columnas explícitas por tabla para los .select() de las páginas de grupo y global (comparten
// componentes). Derivadas de lo que cada componente de tablas.tsx REALMENTE lee (no del tipo TS,
// que en web_clasificacion está incompleto), y cotejadas contra el esquema real de Supabase.
// Incluyen: campos renderizados, columnas de sort/keys, campos condicionales (ciclo_umbral, motivo)
// y codgrupo donde la vista global pinta el badge de grupo (mkGrupo).

// ClasificacionTab / ClasificacionGlobalTab: pos..p0 + mov/forma/racha/p0 (NO están en el tipo TS)
export const COLS_CLASIFICACION =
  'pos, codequipo, nombre_equipo, escudo, pj, pg, pe, pp, gf, gc, dg, pts, mov, elo, pts_fantasy, forma, racha, zona, p0'

// ResultadosTab (fecha para .order)
export const COLS_RESULTADOS =
  'codacta, nombre_local, escudo_local, goles_local, goles_visitante, nombre_visitante, escudo_visitante, fecha'

// web_top_jugadores: goleadores/fantasy/elo/porteros (temporada) + destacados de jornada (goleadores/
// tarjetas/mvp/xi). tipo -> split; codgrupo -> badge global. Cubre goles_enc y racha_5p (TarjetasJornadaTab).
export const COLS_TOP_JUGADORES =
  'codgrupo, tipo, rank, codjugador, codequipo, nombre, posicion, nombre_equipo, escudo, goles, pj, goles_pj, min_gol, pts_fantasy, media_fantasy, elo, goles_enc, p0_pct, racha_5p, partidos_con_gol'

// web_alertas_tarjetas (sancionados): NO se usan estado/amarillas_ciclo/amarillas_simples -> fuera.
export const COLS_ALERTAS =
  'codgrupo, codjugador, nombre, codequipo, nombre_equipo, escudo, posicion, dobles_amarillas, rojas_directas, ciclos_completados, ciclo_umbral'

// web_juego_limpio (equipos + banquillos técnicos)
export const COLS_JUEGO_LIMPIO =
  'codgrupo, codequipo, nombre_equipo, escudo, amarillas, dobles, rojas, amarillas_tec, dobles_tec, rojas_tec'

// web_xi_optimo: XI temporada (pts_totales) y XI jornada (pts_jornada). pos_orden para .order.
export const COLS_XI_OPTIMO =
  'codgrupo, pos_orden, posicion, codjugador, nombre, codequipo, nombre_equipo, escudo, pts_jornada, pts_totales, goles, racha_5p, power_ranking'

// web_equipos_forma (Top5EquiposTab): no usa 'forma'
export const COLS_EQUIPOS_FORMA =
  'codgrupo, rank, codequipo, nombre_equipo, escudo, pts_fantasy'

// web_suspendidos (SuspendidosTab): motivo (render + emoji); no usa equipo_eliminado
export const COLS_SUSPENDIDOS =
  'codgrupo, codjugador, nombre, posicion, codequipo, nombre_equipo, escudo, motivo'
