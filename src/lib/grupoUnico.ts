// DEFENSAS CONTRA "la clave identifica UNA fila", que es un supuesto que el código hacía y el dato rompió.
//
// QUÉ PASÓ (22/10/2026): `JUVENIL/segunda/grupo-9` de T22 tenía DOS filas en `web_grupos` con distinto
// `codgrupo`. Una era un cascarón —calendario entero, 0 partidos jugados, 0 filas de clasificación— y era
// justo la que servía la web: la ficha mostraba "Por comenzar" con la tabla a cero para un grupo que llevaba
// 4 jornadas y 28 partidos, y en `/madrid/juveniles` la pastilla del Grupo 9 salía DOS VECES.
//
// POR QUÉ ESTO SIGUE HACIENDO FALTA AUNQUE EL DATO YA ESTÉ LIMPIO. El pipeline retiró el cascarón y hoy hay
// CERO pares duplicados en las seis temporadas. Pero:
//   - `data[0]` es determinista **por accidente**, porque solo queda una fila; no por diseño. Nadie eligió
//     cuál gana: ganaba la que Postgres devolviera primero.
//   - El mecanismo que creó el duplicado sigue vivo: un upsert que nunca borra, más una reorganización de
//     pretemporada a nivel de GRUPO. Puede volver a pasar.
//   - Y la próxima vez puede no traer un discriminador tan limpio como 0 contra 28. Por eso el desempate
//     termina SIEMPRE en un criterio estable, aunque ninguna fila tenga clasificación.
//
// Las dos funciones son PURAS a propósito: la consulta que dice qué codgrupos tienen clasificación la hace
// quien llama, y solo cuando hace falta. Así se pueden probar contra un caso sintético — que es la única
// forma de probarlas, porque hoy no queda ni un duplicado real contra el que fallar.

// ¿Hace falta desempatar? Si es `false`, quien llama NO debe hacer la consulta extra.
// Hoy esto devuelve `false` en las 528 claves publicadas, así que en la práctica no se ejecuta nunca.
export function hayQueDesempatar(filas: ReadonlyArray<unknown>): boolean {
  return filas.length > 1
}

// Elige UNA fila de grupo entre las que comparten clave. `conClasif` = codgrupos (como string) que tienen
// filas en `web_clasificacion`; quien llama solo lo calcula si `hayQueDesempatar` dijo que sí.
//
// ORDEN DE CRITERIOS, y los tres importan:
//   1. `fam-*` gana. NO es nuevo ni es parte de esta defensa: es la regla que ya existía para copa, donde un
//      slug de familia puede coexistir con un grupo viejo homónimo ('copa-rffm'). Se conserva tal cual y va
//      PRIMERO porque resuelve un problema distinto: familia contra grupo viejo, no original contra cascarón.
//   2. La que TIENE clasificación. Es el discriminador del caso real: el cascarón tenía el calendario entero
//      pero ninguna tabla.
//   3. A igualdad, el `codgrupo` menor. No tiene significado y da igual cuál salga: lo que importa es que
//      salga SIEMPRE LA MISMA. Sin esto volveríamos a depender del orden que devuelva la base.
export function elegirGrupo<T extends { codgrupo: unknown }>(
  filas: ReadonlyArray<T>,
  conClasif: ReadonlySet<string>,
): T | null {
  if (filas.length === 0) return null
  if (filas.length === 1) return filas[0]   // caso normal: ni mira conClasif

  const fam = filas.filter((g) => String(g.codgrupo).startsWith('fam-'))
  const pool = fam.length ? fam : filas

  const conTabla = pool.filter((g) => conClasif.has(String(g.codgrupo)))
  const finalistas = conTabla.length ? conTabla : pool

  return [...finalistas].sort((a, b) => String(a.codgrupo).localeCompare(String(b.codgrupo)))[0]
}

// Deduplica las filas del ÍNDICE (home y categorías) para que no se pinten dos pastillas idénticas.
//
// LA CLAVE ES `slug_comp + slug_grupo`, NO `slug_grupo` A SECAS. Es la que identifica la pastilla, porque es
// la que compone su URL (/madrid/{cat}/{slug_comp}/{slug_grupo}/...). Deduplicar solo por `slug_grupo`
// borraría el "grupo-9" de una competición porque existe otro "grupo-9" en otra — cambiar un bug por otro
// peor. Es la misma lección de [[slug-comp-se-reciclo-en-el-rebrand]]: deduplicar con la MISMA clave con la
// que agrupa quien consume, ni más fina ni más gruesa.
//
// `getGruposIndice` ya deduplicaba por `nombre_comp` -> temporada máxima, pero eso solo descarta temporadas
// viejas: dos filas de la MISMA temporada sobrevivían las dos. Por eso salían dos pastillas.
//
// Qué fila sobrevive: `fam-*` primero (misma regla que arriba), luego la de `jornada_actual` mayor —es lo
// que pinta la pastilla, así que ante la duda la más avanzada— y a igualdad el `codgrupo` menor, otra vez
// solo para que sea estable. Conserva el orden de entrada de las claves.
export function dedupeGruposPorSlug<T extends {
  slug_comp?: unknown; slug_grupo?: unknown; codgrupo?: unknown; jornada_actual?: unknown
}>(filas: ReadonlyArray<T>): T[] {
  const mejor = new Map<string, T>()
  const orden: string[] = []
  for (const g of filas) {
    const k = `${String(g.slug_comp ?? '')}|${String(g.slug_grupo ?? '')}`
    const actual = mejor.get(k)
    if (!actual) { mejor.set(k, g); orden.push(k); continue }
    if (ganaEnIndice(g, actual)) mejor.set(k, g)
  }
  return orden.map((k) => mejor.get(k) as T)
}

function ganaEnIndice(a: { codgrupo?: unknown; jornada_actual?: unknown },
                      b: { codgrupo?: unknown; jornada_actual?: unknown }): boolean {
  const famA = String(a.codgrupo ?? '').startsWith('fam-')
  const famB = String(b.codgrupo ?? '').startsWith('fam-')
  if (famA !== famB) return famA
  const jA = Number(a.jornada_actual ?? 0) || 0
  const jB = Number(b.jornada_actual ?? 0) || 0
  if (jA !== jB) return jA > jB
  return String(a.codgrupo ?? '').localeCompare(String(b.codgrupo ?? '')) < 0
}
