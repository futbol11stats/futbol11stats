import type { ReactNode } from 'react'
import CompartirBtn from '@/components/ficha/v2/CompartirBtn'

// Héroe (cabecera) de las fichas de JUGADOR y EQUIPO: .hero > .hero-top (visual + título + compartir) +
// .hero-pills (pastillas) + extras. Unifica el esqueleto que estaba inline e idéntico en ambas E INTEGRA
// el CompartirBtn (era la misma llamada variant="icon" en las dos). El CSS vive en ficha.css (.fjv2 .hero*).
//
// Lo que DIFIERE de verdad entre jugador y equipo va en slots, no en variantes:
//   · visual → avatar de iniciales (jugador) o escudo (equipo)
//   · title  → el .hero-name completo (jugador: pila/apellidos; equipo: nombre + campo + calendario)
//   · pills  → la fila de pastillas de cada ficha
//   · children → extras dentro del hero (alerta de tarjetas / aviso "sin posición" del jugador)
// Competición (.ident) y partido (.mhero) NO usan esto: son héroes de otra forma. Ver MANUAL_DE_ESTILO.md.

export type EntityHeroProps = {
  visual: ReactNode
  title: ReactNode
  shareTitulo: string
  pills?: ReactNode
  children?: ReactNode
}

export default function EntityHero({ visual, title, shareTitulo, pills, children }: EntityHeroProps) {
  return (
    <div className="hero">
      <div className="hero-top">
        {visual}
        {title}
        <CompartirBtn titulo={shareTitulo} variant="icon" />
      </div>
      {pills != null && <div className="hero-pills">{pills}</div>}
      {children}
    </div>
  )
}
