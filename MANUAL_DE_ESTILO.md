# Manual de estilo y reglas de construcción — Fútbol11Stats

> **Antes de tocar una superficie, VERIFICAR QUE ESTÁ VIVA.** Que un componente exista en el repo no
> significa que se renderice. Antes de rediseñar, unificar o migrar nada, comprobar que algo lo importa
> y que una ruta lo sirve (grep de imports + la ruta real en el navegador). **Contar ficheros no
> distingue lo que se sirve de lo que solo existe.** Esta comprobación va **primero, siempre** — se
> saltó dos veces (la vieja ficha de equipo en `equipo/`, y las ~13 tablas de `tablas.tsx`, ambas
> muertas y sustituidas por sus v2) y en ambas se estuvo a punto de invertir trabajo en un fantasma.
>
> **Después, una sola pregunta: «¿qué pieza hay ya para esto?»**
> Si existe, se reutiliza. Si no encaja del todo, se **amplía** la pieza existente (una prop nueva),
> **nunca** se crea una variante paralela. Así no volvemos a acumular 5 pastillas para lo mismo.

Este documento es la fuente de verdad del diseño del sitio. Se escribe **a medida** que se construye
el catálogo (en tandas), no al final. Vive junto a [`PROTOCOLO.md`](./PROTOCOLO.md).

---

## 1 · Reglas de oro

1. **Los componentes CAMBIAN DE FORMA al ensanchar, no se estiran.** Al pasar a escritorio, una pieza
   añade columnas, gana una columna lateral (aside) o cambia de densidad — **jamás** reparte cuatro
   elementos a los bordes dejando un hueco muerto en el centro. (El origen de la queja: las filas de
   alineación de la ficha de partido, pensadas para 390px y estiradas a 640px.)
2. **Un nombre de persona NUNCA se trunca.** Si no cabe, se abrevia el nombre de pila a inicial y los
   apellidos van completos (`J. Barroso Sánchez`). Si aun así no cabe, la regla de abreviatura está mal
   — se corrige la regla, **nunca** se cortan los apellidos con puntos suspensivos.
   - **Excepción explícita y razonada — el HÉROE.** El titular de la ficha (jugador/equipo) va en
     MAYÚSCULAS y ocupa una línea entera: ahí funciona como **marca**, no como fila apretada. La regla
     del "nunca truncar / nunca mayúsculas" nace de las listas densas, no del titular. No es un descuido.
   - **Nombre de EQUIPO — va SIEMPRE COMPLETO.** La regla de "nunca truncar" aplica a **personas**; los
     equipos **ni se abrevian ni se recortan**. Abreviar les hace perder el nombre por el que se les
     conoce (`San Sebastián de los Reyes` no es `San Sebastián Reyes`; `Club Atlético` a secas no dice
     nada). Solo se aplica capitalización normal respetando siglas y preposiciones
     (`LAS ROZAS C.F. 'A'` → `Las Rozas C.F. 'A'`).
     **Si en algún sitio no cabe, se resuelve por DISEÑO, no recortando el nombre:** menos columnas, otra
     densidad, o **el escudo sin nombre** donde el contexto ya dice de qué equipo se trata.
3. **Un concepto, un icono, en todo el sitio.** Nada de gol=SVG aquí y emoji allá.
   - Ante duda entre **nuestro set** (`src/components/iconos.tsx`) y **lucide-react**, gana **nuestro set**
     — es el que da personalidad al sitio.
   - **NUNCA emojis** (`📅`, `🟨`, `🟥`…): cada sistema operativo/navegador los dibuja distinto, así que
     nunca se ven igual. Icono propio siempre.
   - **La violación MÁS DIFÍCIL de detectar es un icono con DOBLE FUNCIÓN** — el mismo glifo para dos
     conceptos. El escudo significaba equipo/rival **y** «partidos jugados» a la vez: pasa desapercibido
     porque en cada sitio, por separado, «parece bien». Regla práctica: cuando un icono no case con su
     dato, **grep del icono en TODO el repo** — casi siempre está mal en varios sitios, y se esconde en
     helpers **inline** que no pasan por un componente compartido (ahí no llega el barrido). Se corrigió
     el escudo→sigla «PJ» en todas las filas + KPIs + `campos`, dejando el escudo solo para equipo/rival.
   - **Iconos donde APRIETA, palabras donde hay SITIO.** Un icono gana en una fila densa; en un pie de
     tabla o un bloque con aire, «como titular» se entiende sin descifrar. No forzar iconos por estética.
4. **Puntos primero, ELO después.** El fantasy es el dato principal; el ELO, su efecto.
5. **Silencio antes que dato dudoso.** Un valor ausente no se pinta (ni `0`, ni `1000`, ni `—` cuando
   induce a error). `null` = no se renderiza.
6. **Si algo ya existe, se reutiliza; si no encaja, se AMPLÍA la pieza, no se crea una variante.**
   Esta resume todas las demás.

---

## 2 · Tokens

Fuente única: **`src/app/globals.css` (`:root`)**. Ya no hay tokens duplicados en `.fjv2`; esa clase
conserva solo variables de *layout* (`--plotH`, `--colW`, `--pad`). Los componentes de `src/components/ui`
y el CSS de las fichas consumen estas variables; **resuelven en todo el sitio**.

### Breakpoint
- **Uno solo: `1000px`.** Móvil `< 1000` ≤ escritorio. Toda media query de diseño usa este corte.
  (Los breakpoints Tailwind `sm/md/lg` que quedan en tablas/directorios son deuda a migrar a 1000px.)

### Tipografía
- Dos familias: **Inter** (`--font-body`) para prosa; **Barlow Condensed** (`--font-display`, pesos
  700/800) para cifras, nombres y titulares.
- Escala de 10 pasos, **sube un paso entero a 1000px**. **Suelo de 11px en móvil** (`--t-micro`): nada
  baja de ahí.

  | Token | Móvil | ≥1000px | Uso |
  |---|---|---|---|
  | `--t-micro` | 11 | 12 | rótulos, metadatos, leyendas |
  | `--t-cap` | 12 | 13 | pastillas pequeñas, captions |
  | `--t-sm` | 13 | 14 | texto secundario |
  | `--t-body` | 14 | 15 | cuerpo |
  | `--t-lead` | 15 | 17 | entradilla, nombre de fila |
  | `--n-sm` | 18 | 21 | cifra pequeña (pastilla) |
  | `--n-md` | 24 | 28 | KPI |
  | `--n-lg` | 32 | 38 | cifra grande |
  | `--h-sec` | 19 | 23 | título de sección |
  | `--h-hero` | 27 | 42 | titular de héroe |

- **Prohibido** `text-[Npx]` de Tailwind y `font-size` a pelo. Si falta un tamaño, se añade a la escala,
  no se inventa suelto.

### Formato numérico
- **Punto de millar en toda cifra de 4+ dígitos**, en todo el sitio (minutos, PF, ELO, partidos, goles
  acumulados, cualquier total): `1.175`, no `1154`. Es lo correcto en español y se lee de un vistazo.
- **Función única: `fmtNum`** (`src/lib/formato.ts`). Todo número se pinta a través de ella (es no-op para
  <1000, y devuelve `—` para `null`). No usar `toLocaleString` suelto ni `Math.round(...).toString()` a mano.
- **Dos excepciones sin punto:** los **DELTAS** (`+11`, `−24` — usa `fmtDelta`) y los **AÑOS/temporadas**
  (`2026`, `2025-26`).

### Fechas de partido
- **Referencia COMPLETA: día + mes + año** (`7 jun 2025`). El año es parte de la referencia (una
  temporada cruza dos años; en listas de varias temporadas el día·mes solo no ubica el año). Formato
  único vía `fechaCorta` (`src/lib/jugador.ts`) y la fecha de `MatchRow` — mismo aspecto en todo el sitio.
- **No repetir la temporada** junto a una fecha que ya lleva el año (era redundante). La temporada solo
  aparece como rótulo de sección/grupo, no pegada a la fecha en la misma referencia.

### Nomenclatura: Forma / Racha / Rendimiento (única en todo el sitio)
Tres conceptos, tres nombres — nunca intercambiados:
- **Forma** = los **últimos 5 resultados** (G/E/P). La tira `FormaStrip`. Clasificación (col. "Forma"),
  hero de partido, y el bloque de últimos-5 en las fichas de equipo/jugador.
- **Racha** = un **hito de continuidad** (x victorias seguidas, x partidos marcando, invicto; la "3V" de la
  clasificación). Clasificación (col. "Racha"), bloque "Rachas" de la ficha de partido.
- **Rendimiento** = la **media de puntos fantasy** por partido (ventanas). Sección "Rendimiento" de las
  fichas de equipo/jugador (antes se llamaba "Forma", y su tira de 5 se rotulaba "Racha" — ambos mal).

### Color — significados (no reutilizar fuera de su rol)
| Token | Valor | Significado |
|---|---|---|
| `--e3` / `--e4` | verde | **positivo**: ganó, ELO sube, bueno |
| `--e0` | rojo | **negativo**: perdió, ELO baja |
| `--e1` | gris | neutro / empate |
| `--amber` | ámbar | **SOLO** playoff · copa · disciplina (tarjetas). **Nunca** como acento general |
| `--ink` … `--ink-4` | | jerarquía de texto (100 → 40 %) |
| `--pitch-900/800/700` | | fondos (más oscuro → más claro) |

---

## 3 · Catálogo de componentes

> Ubicación: `src/components/ui/`. Ante una necesidad, **buscar aquí primero**.

### Átomos (Tanda 1)

| Componente | Resuelve | Sustituye a | Uso |
|---|---|---|---|
| **`PlayerName`** | nombre de persona (regla oro nº2) | 4 formatos + `NombreJugador` + `formatNombre` suelto | toda tabla/fila/ficha con nombre de jugador |
| **`TeamName`** | nombre de equipo, sin truncar | `NombreEquipo` + truncados CSS | toda referencia a un equipo |
| **`EloDelta`** | Δ ELO del partido (verde/rojo) | `.m-elo`, `.pl-elo`, inline sueltos | siempre DESPUÉS de los puntos |
| **`Badge11`** | sello «11» — **marca de DATO PROPIO** (lo calculamos nosotros: ELO, PF, media…), NO el icono de un dato concreto. Va en todos ellos, **mismo color**; los distingue el RÓTULO (`PF`/`ELO`), no el color (verde/rojo ya significan bueno/malo y subida/bajada, un sello verde junto a un delta rojo daría señales cruzadas) | 5 copias inline | KPIs, líderes, Panorama |
| **`FormaStrip`** | últimos N resultados (puntos) | dots v2 / cuadros clasificación / letras FormaHero | forma de equipo/jugador |
| **`PlayerAvatar`** | avatar de iniciales coloreado por demarcación (`avaStyle`) | `avaStyle`/`iniciales` inline duplicados en 2 sitios | hero, campoXI, PlayerRow, MVP; `label` sustituye las iniciales por el dorsal |

> La **pastilla de puntos fantasy** NO es un átomo suelto: se realiza como CSS (`.pl-val` en `PlayerRow`, `.m-pts` en `MatchRow`) — ya consistente, siempre ANTES del `EloDelta`. Los **rótulos micro-mayúsculas de ámbito** ("Todas las temporadas"…) los absorbe ya `SectionHeader` vía su prop `scope` (chip `.allscope`) — no se escriben a mano. Se intentaron como átomos sueltos (`PointPill`, `MicroLabel`) en la Tanda 1, pero quedaron sin cablear → se retiraron (no se dejan átomos fantasma). Si se necesitan, se reintroducen **ya cableados**.

Helpers de nombre: **`src/lib/nombre.ts`** — `abreviaNombre` (por defecto), `nombreCompleto` (héroe),
`inicialesNombre` (avatar), `nombreEquipo`. No volver a escribir `formatNombre(...).split(...)` inline.

### Filas y tablas (Tanda 2)

| Componente | Resuelve | Sustituye a | Uso |
|---|---|---|---|
| **`EntityCard`** ✅ | tarjeta-fila de directorio (icono + título + subtítulo) | `ClubesLista` y `CamposLista` (gemelas; solo cambiaba el icono) | /clubes, /campos |
| **`CompeticionCard`** ✅ | tarjeta de competición (sello + título + chips a grupos) | 3 copias casi literales (home, /aficionados, /juveniles) | índices; `categoria` por prop, leyenda histórica opcional |
| **`MatchRow`** ✅ | fila de "partido reciente", presentación **cara a cara** | (ya existía; rediseñada al híbrido) | equipo (Últimos partidos) / jugador (Mejores actuaciones) / partido (forma). **Línea 1**: los DOS equipos (escudo+nombre, `propioNombre/Escudo/Cod` + `rival*`) con el marcador centrado coloreado por el resultado del sujeto, ganador en negrita. **Línea 2** (meta): fecha·competición + datos del bloque. **El contenido depende del SUJETO** (mismo criterio que los eventos): en **Mejores actuaciones** el PF es EL dato → se pasa `pts`, DESTACADO y rotulado (`.mh-pf`); en **Últimos partidos** no hay protagonista (11 jugadores) → SIN PF, solo `eloDelta` (propiedad del equipo), rotulado "ELO" en la cabecera del bloque. Eventos: del jugador vs agregados del equipo (lo decide quien la llama). Copa (rondas) usa la fila simple `.match`, no esta |
| **`PlayerRow`** ✅ | fila `.pl` de jugador | 5 reimplementaciones (FilaJugador + plantilla ×2 + alineación + técnico) | usa PlayerAvatar/NombreJugador/Pastilla/EloDelta + pastilla `.pl-val`; reflow escritorio: meta en línea, sin hueco muerto |
| ~~`StatTable`~~ — **no procede** | tabla dirigida por config | — | Las ~13 tablas de `tablas.tsx` que iba a unificar **ya estaban muertas**: la ficha de competición **v2** las sustituyó en su día por rankings de barras (`RankingComp`) + clasificación inline. No hay flota de tablas gemelas viva que unificar. El único `<table>` de stats vivo es `Trayectoria` (ficha de jugador), específico y sin gemelas. El patrón de tabla ancha queda documentado abajo (§ Patrones) por si reaparece. |

### Cabeceras y layout (Tanda 3)

> Alcance recortado tras verificar qué está VIVO (regla nº0): 3 de las 4 piezas tienen menos
> consumidores de lo que sugería el nombre. **No forzar una pieza sobre superficies que no comparten
> su forma.**

| Componente | Resuelve | Sustituye a | Uso |
|---|---|---|---|
| **`SectionHeader`** ✅ | cabecera de sección (`.s-head/.s-title/.s-sub`) | **49 copias inline** del mismo trío en las 5 fichas + JornadasEquipo + TarjetasTemporadaV2 | `title` + `sub` (libre) o `scope` (chip `.allscope`) + `style` puntual. **Absorbe los micro-rótulos** que quedaron inline al retirar MicroLabel |
| **`PageLayout`** ✅ (aside) | grid `.layout` 360/1fr + `.aside` sticky + `.main` | 2 fichas idénticas (**jugador + equipo**) | API compuesta (`PageLayout.Aside`/`.Main`). Competición NO la usa (`.full`, ancho completo). Barrido de paso el CSS muerto `.fcv2 .layout/.aside`. **Revisión del escritorio (motivo de la Tanda 3): el 360/1fr es correcto** — la ficha va topada a `max-width:1160px`, así que a 1400px+ NO se estira (centra); split 360/798 balanceado, sin huecos. Los huecos que señaló Fernando eran las alineaciones del partido (`.al-grid`), ya resueltas. No se toca la proporción |
| **`EntityHero`** ✅ | hero `.hero/.hero-top/.hero-pills` | 2 fichas (**jugador + equipo**) | Slots `visual`/`title`/`pills`/`children` (lo que difiere) + integra el `CompartirBtn` (era idéntico). Competición (`.ident`) y Partido (`.mhero`) son heroes DISTINTOS — NO usan este |
| **`TabBar`** ✅ | route-tabs `.tabs/.modo/.jrow/.verrow` (sobre `ScrollRail`+`ReportesScroll`) | 2 fichas de competición (grupo + global) | Slots `modo`/`jornadas`/`ver` (listas de `<Link>`, los hrefs difieren); TabBar posee el esqueleto + raíles. NO mezclar con `NavSpy` (scroll-spy de jugador/equipo) ni `MatchdaySelector`: conceptos distintos |
| **`PartidoTabs`** ✅ | pestañas de la ficha de PARTIDO (Resumen / Alineaciones / Cara a cara) | scroll de ~4,6 pantallas a 390px | Cliente: toggle **en la misma página** (un partido = 1 URL), con `<button>` — NO es `TabBar` (esa navega por RUTAS). Reutiliza el estilo `.verrail` de competición vía `.fpv2 .ptabs` (mismo subrayado verde activo) + `ScrollRail`. El contenido de TODAS las pestañas se sirve en el HTML y se oculta con `[hidden]` — patrón § abajo. Bajó el scroll por defecto a ~2,1 pantallas |

---

## 4 · Cómo añadir algo nuevo

0. **VERIFICA QUE LA SUPERFICIE ESTÁ VIVA** (antes que nada). Grep de imports del componente/tabla que
   vas a tocar + abre la ruta real. Si nadie lo importa o ninguna ruta lo sirve, es un fantasma: no lo
   rediseñes, **bórralo** (o déjalo si la decisión es de otro). Contar ficheros ≠ contar renders.
1. **Busca en el catálogo (§3).** ¿Hay una pieza para esto? Úsala.
2. **¿Casi encaja?** Amplía la pieza con una prop (`variant`, `size`, `compact`…). No la clones.
3. **¿No existe?** Créala en `src/components/ui/`, autocontenida (estilos por token/inline, sin depender
   de `.fjv2`), con las reglas de oro incorporadas (cambia de forma al ensanchar; nunca trunca nombres;
   `null` = silencio). **Añádela a este catálogo en el mismo commit.**
4. **Tokens:** usa las variables de `:root`. Si falta un tamaño/color, añádelo a la escala con su
   significado, no lo pongas a pelo.
5. **Anchos:** define el comportamiento a los dos lados del breakpoint 1000px (qué hace en móvil, cómo
   se recoloca en escritorio). Nunca «estirar» la versión móvil.
6. **Verifica:** `npx tsc --noEmit && npm run build`. Agrupa cambios; no despliegues por cada uno (cada
   deploy regenera páginas ISR y consume cupo de Vercel — ver [[revalidacion-coste-vercel]]).

---

## 5 · Patrones documentados (no son componentes)

Recetas probadas que **no** justifican un componente propio hoy, pero que conviene no reinventar si
reaparece el caso. Se guardan aquí, no en `src/`, para no dejar código sin cablear (átomo fantasma).

### Tabla ancha en móvil — identidad fija + scroll, sin truncar el nombre

**Problema:** una tabla con muchas columnas no cabe en 390px. La salida MALA (y la que había en el
difunto `tablas.tsx`) era **ocultar** columnas (`hidden md:table-cell`) y **truncar** el nombre
(`col-nombre` con `max-width` + `ellipsis`) → rompe la regla de oro nº2.

**Patrón:** la **columna de identidad** (nombre) se ancla (`position: sticky; left: 0`) y las métricas
hacen **scroll horizontal** por debajo (contenedor `overflow-x: auto`). El nombre va `white-space:
nowrap` con **ancho natural** (sin `max-width`): cabe entero a cualquier anchura; la métrica que no
quepa se descubre haciendo scroll, **nunca comiéndose el nombre**. La celda fija necesita fondo
**opaco** (tapa lo que pasa por detrás), también en `:hover`.

```css
/* .wide = table; .id = celda de identidad (th y td) */
.wide td.id, .wide th.id { position: sticky; left: 0; z-index: 1; background: var(--pitch-800); }
.wide th.id { z-index: 2; }
.wide tr:hover td.id { background: #122549; }  /* = pitch-700/50 sobre pitch-800, pero opaco */
.wide td.id .nombre { white-space: nowrap; }   /* nombre entero, jamás max-width ni ellipsis */
```

**Aviso de diseño (lo que verificar si se usa):** que fijar la 1ª columna no la re-estreche hasta
truncar. El ancho lo manda el nombre, no una cifra fija. Con nombres patológicos muy largos la columna
fija puede tapar casi todo el viewport — es el coste aceptado de no truncar; se resuelve por diseño
(menos columnas, otra densidad), nunca recortando el nombre.

### Tope de N líneas en una fila de chips, sin sliver ni corte a medias

**Problema:** una línea de chips (iconos + ×N) que puede saturar en poco ancho (p.ej. la meta de la
forma compacta del partido, a dos columnas). Queremos permitir hasta N líneas y ocultar lo que sobre
**sin** que asome media línea ni se parta un icono — que se lea como si simplemente hubiera menos.

**Patrón (CSS puro, sin JS):** `flex-wrap` envuelve **chips enteros** (nunca parte un icono). Si se
fuerza un **`line-height` uniforme** y se pone `max-height = N × line-height` + `overflow: hidden`, la
línea N+1 empieza EXACTAMENTE en el corte y se oculta entera → cero sliver. Ordenar los chips por
prioridad hace que lo que se oculta sea siempre lo menos importante (lo deducible de otra parte).

```css
/* cap a 2 líneas de 18px, chips y meta con el MISMO line-height para que el corte sea exacto */
.meta{ line-height:18px; max-height:36px; overflow:hidden; align-content:flex-start }
.meta > *{ line-height:18px }
.meta svg{ display:block }   /* el icono no estira la caja de línea por encima de 18px */
```

Verificado: a 250px todas las filas quedan en 36px exactos (0 filas >36 → imposible que asome media
línea). Solo aplicar donde el espacio aprieta (variante `compact`); las filas a ancho completo van sin
tope. Ojo: el contexto (fecha, etc.) va antes que los chips en el DOM, así que en anchos absurdamente
pequeños (&lt;300px, ningún dispositivo real) el recorte cae antes sobre los chips — asumido a propósito.

### Pestañas dentro de una página SIN perder SEO — ocultar por CSS, no render condicional

**Problema:** una ficha larga (la de partido eran ~4,6 pantallas a 390px) se agrupa en pestañas para
bajar el scroll, pero un buscador debe seguir viendo TODO el contenido. Las pestañas son de **una sola
página** (un partido = 1 URL), no rutas — así que no valen `<Link>` a rutas (eso es `TabBar`).

**Patrón:** un componente **cliente** con `useState` para la pestaña activa, que renderiza el contenido
de TODAS las pestañas (viene server-rendered como `ReactNode` en props) y **oculta las inactivas con el
atributo `hidden`** (= `display:none`). El contenido sigue **en el HTML servido** (indexable), solo no se
pinta. **NUNCA render condicional** (`activo && <Panel/>`) — eso lo quitaría del HTML y perdería SEO.

```tsx
{tabs.map(t => <div key={t.id} hidden={t.id !== activo}>{t.panel}</div>)}  // panel siempre en el DOM
```

- **Estilo:** reutilizar el de las pestañas de competición (`.verrail`, subrayado verde en la activa),
  no inventar otro. Como el partido es `.fpv2` y aquel CSS está scoped a `.fcv2`, se replican los MISMOS
  valores en `.fpv2 .ptabs` (con `<button>` en vez de `<a>`).
- **«Hay más pestañas»:** envolver el raíl en `ScrollRail` — ya da degradado + flechas cuando no caben.
- Verificado en producción: el panel oculto de Alineaciones sigue en el HTML (1.341 chars); scroll por
  defecto 4,6 → 2,1 pantallas (el hero se queda arriba siempre, de ahí que no baje a 1,6).
