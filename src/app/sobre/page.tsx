import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/LegalDoc'

// Página INDEXABLE (al contrario que las legales): explica autoría y propósito del proyecto -> va en
// el sitemap y sin robots noindex.
export const metadata: Metadata = {
  title: 'Sobre Fútbol11Stats — qué es y cómo medimos | Fútbol11Stats',
  description: 'Fútbol11Stats es un proyecto independiente que documenta el fútbol aficionado y juvenil de Madrid: 38.000 jugadores y 1.900 equipos desde 2021-22, con ELO, Puntos Fantasy y Ranking F11S.',
  alternates: { canonical: '/sobre' },
}

const CONTENIDO = `# Sobre Fútbol11Stats

## Qué es esto

**Fútbol11Stats** documenta el fútbol aficionado —hoy, el de la Comunidad de Madrid—: clasificaciones, resultados, estadísticas y trayectorias de más de 38.000 jugadores y 1.900 equipos, desde la temporada 2021-22 hasta hoy.

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

Tres indicadores propios acompañan a los datos. Son herramientas de lectura, no veredictos: sirven para comparar y para hacerse una idea, nunca para decidir nada.

### ELO

El **ELO de un equipo** se mueve con cada resultado y mide su rendimiento frente a los rivales que le han tocado: ganar a un equipo fuerte suma más que golear a uno débil, y perder ante un rival flojo penaliza más que caer ante el líder.

El **ELO de un jugador** mide otra cosa: la **regularidad con la que rinde por encima de la media de su propio equipo**, partido a partido. No compite contra el rival, sino contra sus compañeros de esa tarde; la exigencia del adversario sí influye en cuánto se mueve el valor. Es una trayectoria continua a lo largo de su carrera, que no se reinicia al cambiar de club.

Dos consecuencias que conviene tener presentes al leerlo. Un ELO alto habla de **dominio dentro del propio contexto**, no de nivel absoluto en la pirámide: el mejor jugador de un equipo modesto puede superar en ELO a un buen jugador de un equipo lleno de buenos jugadores. Y por eso, en las fichas mostramos además el **percentil dentro de su categoría**, que responde a una pregunta distinta y a menudo más útil: dónde se sitúa entre quienes compiten en su mismo nivel.

### Puntos Fantasy

Un sistema **objetivo** de puntuación por partido, calculado a partir de lo que recoge el acta arbitral: minutos disputados, goles, porterías a cero, tarjetas y demás sucesos del encuentro, ponderados según la demarcación del jugador —lo que vale un gol no es lo mismo para un delantero que para un defensa—.

No hay valoración subjetiva ni opinión: los mismos hechos producen siempre los mismos puntos.

### Ranking F11S

La posición de cada jugador respecto a los demás según su rendimiento en la última temporada disputada, en tres escalas: **general** (entre todos los jugadores del sistema), **por competición** (entre quienes juegan en su misma categoría) y **por demarcación** (entre quienes ocupan su puesto).

Un puesto alto en el ranking general y otro modesto en el de su competición cuentan cosas distintas, y esa es precisamente la gracia.

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

export default function SobrePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-chalk-200">
      <nav className="text-sm text-chalk-600 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <span className="text-white">Sobre el proyecto</span>
      </nav>
      <LegalDoc content={CONTENIDO} />
    </div>
  )
}
