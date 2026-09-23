import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/LegalDoc'
import { fmtNum } from '@/lib/formato'
import { getAlcance, floorAprox } from '@/lib/alcance'

export const revalidate = 2592000   // ISR 30d; las cifras se refrescan con el tag `alcance` (re-export/--home).

// Página INDEXABLE (al contrario que las legales): explica autoría y propósito del proyecto -> va en el sitemap
// y sin robots noindex. Las cifras de volumen se LEEN de la BD (web_alcance) vía getAlcance (ver [[alcance.ts]]).
export async function generateMetadata(): Promise<Metadata> {
  const alc = await getAlcance()
  return {
    title: 'Sobre Fútbol11Stats — qué es y cómo medimos | Fútbol11Stats',
    description: `Fútbol11Stats es un proyecto independiente que documenta el fútbol aficionado y juvenil de Madrid: ${fmtNum(floorAprox(alc.jugadores))} jugadores y ${fmtNum(floorAprox(alc.equipos))} equipos desde 2021-22, con ELO, Prime, Puntos Fantasy y Rating F11S.`,
    alternates: { canonical: '/sobre' },
  }
}

const contenido = (jugadores: string, equipos: string) => `# Sobre Fútbol11Stats

## Qué es esto

**Fútbol11Stats** documenta el fútbol aficionado —hoy, el de la Comunidad de Madrid—: clasificaciones, resultados, estadísticas y trayectorias de más de ${jugadores} jugadores y ${equipos} equipos, desde la temporada 2021-22 hasta hoy.

Nació de una constatación sencilla: el fútbol modesto genera cada fin de semana una cantidad enorme de datos —goles, minutos, alineaciones, tarjetas— que quedan dispersos en actas y desaparecen al acabar la temporada. Nadie los guarda, nadie los ordena y nadie los devuelve a quienes los protagonizan. Aquí sí.

Este es un **proyecto independiente**, sin vinculación con ninguna federación, club ni competición, y sin ánimo de lucro. La información procede de las fuentes públicas oficiales, sobre las que aplicamos procesos propios de estructuración, verificación y cálculo.

---

## Qué encontrarás

- **Clasificaciones y resultados** de todas las competiciones de aficionados y juveniles, con una «máquina del tiempo» para ver cómo iba la tabla en cualquier jornada de cualquier temporada — por grupo o en una vista global que reúne todos los grupos de una misma categoría.
- **Fichas de jugador**, solo de mayores de edad, con su trayectoria en las competiciones de la RFFM —equipos, partidos, minutos, goles y tarjetas, temporada a temporada—, sus mejores actuaciones partido a partido, su ELO y su percentil dentro de la categoría, y los hitos y récords que va dejando (debuts, primeras veces, cifras redondas).
- **Fichas de equipo** con la plantilla, los movimientos de cada temporada, el historial y el palmarés, el recorrido por rondas en copas y play-offs, y sus propios hitos y récords.
- **Fichas de partido** que reconstruyen el acta arbitral: las alineaciones de los dos equipos —titulares, suplentes y entrenador—, los goles y las tarjetas con su minuto, las sustituciones, el MVP del encuentro por Puntos Fantasy, el movimiento de ELO de cada equipo tras el resultado, el pronóstico previo derivado del ELO, las rachas de ambos y las efemérides que dejó el partido.
- **Rankings** de goleadores, porteros, mejores por Puntos Fantasy y por media, mejor ELO, juego limpio y el once ideal de cada jornada y de cada temporada.
- **Directorio de clubes**: cada club de Madrid con todos sus equipos, de la primera plantilla a las categorías de base.
- **Directorio de campos**: las instalaciones donde se juega, con su ubicación, los equipos que las usan como sede y cómo llegar hasta ellas.
- **Calendario suscribible**: puedes seguir a un equipo desde el calendario de tu móvil u ordenador; sus partidos aparecen solos y los horarios se actualizan cuando la federación los confirma o los cambia.

El alcance es el de las competiciones de la **Real Federación de Fútbol de Madrid (RFFM)**. Los torneos que gestionan otras federaciones —la División de Honor Juvenil, o la Segunda y la Primera RFEF, que dependen de la RFEF— quedan fuera por ahora. Por eso la trayectoria de un jugador puede presentar **huecos entre temporadas** si en alguna compitió en ellos: no es que falten datos, es que esa competición no forma parte de nuestra fuente.

---

## Cómo medimos

Estos son los indicadores que calculamos nosotros. Son herramientas de lectura, no veredictos: sirven para comparar y para hacerse una idea, nunca para decidir nada.

### ELO

El **ELO de un equipo** se mueve con cada resultado y mide su rendimiento frente a los rivales que le han tocado: ganar a un equipo fuerte suma más que golear a uno débil, y perder ante un rival flojo penaliza más que caer ante el líder.

El **ELO de un jugador** mide otra cosa: la **regularidad con la que rinde por encima de la media de su propio equipo**, partido a partido. No compite contra el rival, sino contra sus compañeros de esa tarde; la exigencia del adversario sí influye en cuánto se mueve el valor. Es una trayectoria continua a lo largo de su carrera, que no se reinicia al cambiar de club.

Dos consecuencias que conviene tener presentes al leerlo. Un ELO alto habla de **dominio dentro del propio contexto**, no de nivel absoluto en la pirámide: el mejor jugador de un equipo modesto puede superar en ELO a un buen jugador de un equipo lleno de buenos jugadores. Y como esa trayectoria sube y baja a lo largo de los años, cada jugador acaba teniendo **un techo y un suelo propios** — su ELO máximo y su ELO mínimo históricos —. El recorrido entre esos dos valores es justo lo que mide el indicador siguiente.

### Prime

El **Prime** responde a una pregunta que el ELO por sí solo no contesta: **dónde está hoy un jugador dentro de su propia horquilla histórica**. Al 100% está en su mejor momento, el mejor ELO que ha tenido nunca; al 0%, en el peor. A mitad de camino, la llama se llena hasta la mitad.

Es **relativo a cada jugador, y por eso no sirve para comparar a dos**. Alguien con un recorrido corto puede estar al 90% de lo suyo y tener menos ELO que otro que está al 40% del suyo: no dice quién es mejor, dice quién está más cerca de su propio techo.

Y **se autoajusta solo**: si un jugador supera su mejor marca, esa marca pasa a ser el nuevo 100% y el Prime vuelve a estar arriba del todo. Nadie se queda por encima de su propio techo.

No aparece hasta que la carrera acumula **al menos cinco partidos con ELO registrado** — copa y playoff incluidos —, ni cuando el máximo y el mínimo coinciden. Con menos recorrido la horquilla sería demasiado estrecha para significar nada, y un porcentaje calculado sobre ella daría una precisión que el dato no tiene.

### Percentiles por categoría

El ELO y las medias de puntos dicen cuánto, pero no **entre quiénes**. El percentil sí: sitúa a cada jugador y a cada equipo frente a los que compiten **en su mismo nivel**, y responde a la pregunta más útil de todas — dónde se sitúa dentro de su categoría, no dentro del conjunto.

Son además los que dan **color** a buena parte de la web: los verdes, ámbares y rojos de las cifras no son umbrales inventados, sino los tramos en los que cae ese valor dentro de su propia categoría y temporada.

### Rating F11S

Una **nota de 0 a 100** por temporada, todavía en fase de pruebas, que resume el rendimiento de un jugador y lo compara con **toda la pirámide aficionada madrileña a la vez** — de Tercera RFEF a Primera Autonómica — y no solo con los de su categoría. Un 80 significa que rindió mejor que el 80% de los jugadores de esa temporada en toda la rama.

Dos límites que conviene conocer. Solo lo reciben los jugadores con **demarcación conocida**, porque el cálculo pondera según el puesto: si no sabemos dónde juega, no hay nota. Y el fútbol **juvenil queda fuera** de esta escala. Por eso muchas fichas no lo muestran.

### Puntos Fantasy

Una puntuación por partido calculada a partir de lo que recoge el acta arbitral: minutos disputados, goles, porterías a cero, tarjetas y demás sucesos del encuentro, ponderados según la demarcación del jugador — lo que vale un gol no es lo mismo para un delantero que para un defensa —.

El sistema es **determinista**: no interviene ninguna valoración subjetiva y los mismos hechos producen siempre los mismos puntos. El **baremo concreto no se publica**, por formar parte del sistema propio del proyecto, como recoge el [aviso legal](/aviso-legal). Preferimos decirlo así a presentarlo como objetivo sin darte con qué comprobarlo.

### Puestos y rankings

A partir de los puntos fantasy acumulados en la temporada, cada jugador ocupa un **puesto** en tres escalas: **general** (entre los jugadores que compitieron esa temporada), **por competición** (entre quienes juegan en su misma categoría) y **por demarcación** (entre quienes ocupan su puesto). Hay además escalas por franja de edad para juveniles y sub-23.

Un puesto alto en el general y otro modesto en el de su competición cuentan cosas distintas, y esa es precisamente la gracia.

### XI Óptimo

El **once ideal** de una jornada o de una temporada: los once jugadores con mejor puntuación fantasy respetando una alineación posible, con un portero, defensas, centrocampistas y delanteros. Cuando el once abarca varias competiciones a la vez, las puntuaciones se **normalizan entre grupos** antes de compararlas, para que no lo copen siempre los de la categoría que más puntos reparte.

### Juego limpio

Un recuento disciplinario por equipo — amarillas, dobles y rojas directas — que incluye también las de su **banquillo técnico**, no solo las de los jugadores. Es el único de estos indicadores en el que **ir arriba es malo**.

---

## Ayúdanos a mejorarlo

Los datos provienen de las actas oficiales, y las actas a veces se equivocan: un nombre mal escrito, una demarcación que no corresponde, un jugador atribuido a otro equipo. Nosotros no podemos saberlo; tú sí.

**Si ves algo incorrecto o incompleto, escríbenos a futbol11stats@gmail.com.** Nos interesa especialmente:

- **Posiciones**: muchas fichas no tienen demarcación asignada, o la tienen deducida del dorsal. Si conoces la de un jugador —la tuya, la de un compañero—, dínoslo.
- **Errores de identificación**: nombres equivocados, jugadores confundidos entre sí, equipos mal atribuidos.
- **Cualquier dato que no cuadre** con lo que sabes de primera mano.

Cada aviso se revisa y, si procede, se corrige. No hace falta que te identifiques ni que justifiques nada.

Y si tus datos aparecen aquí y **prefieres que no lo hagan**, basta con pedirlo por el mismo correo: se retiran sin necesidad de dar explicaciones. Puedes consultar el detalle en la [Política de Privacidad](/privacidad).

---

## Síguenos

Publicamos datos destacados de cada jornada en [Instagram](https://www.instagram.com/futbol11stats) y [TikTok](https://www.tiktok.com/@futbol11stats).`

export default async function SobrePage() {
  const alc = await getAlcance()
  const content = contenido(fmtNum(floorAprox(alc.jugadores)), fmtNum(floorAprox(alc.equipos)))
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-chalk-200">
      <nav className="text-sm text-chalk-600 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <span className="text-white">Sobre el proyecto</span>
      </nav>
      <LegalDoc content={content} />
    </div>
  )
}
