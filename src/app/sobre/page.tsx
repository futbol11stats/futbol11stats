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

- **Clasificaciones y resultados** de todas las competiciones de aficionados y juveniles, con la posibilidad de ver cómo iba la tabla en cualquier jornada de cualquier temporada.
- **Fichas de jugador** con su trayectoria completa: equipos, partidos, minutos, goles, tarjetas y sus mejores actuaciones, partido a partido. Solo se publican fichas de jugadores mayores de edad.
- **Fichas de equipo** con plantilla, movimientos de temporada, historial y palmarés.
- **Copas y play-offs**, con su recorrido por rondas.
- **Rankings** de goleadores, porteros, juego limpio y rendimiento.

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
