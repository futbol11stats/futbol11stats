import type { CSSProperties, ReactNode } from 'react'

// Cabecera de sección ÚNICA de las fichas (el trío .s-head / .s-title / .s-sub). Unifica las ~49
// repeticiones inline repartidas por las 5 fichas v2 (jugador, equipo, competición grupo/global, partido)
// + JornadasEquipo + TarjetasTemporadaV2. El CSS vive en ficha.css bajo la clase raíz .fjv2 (TODAS las
// fichas cuelgan de .fjv2 — equipo es .fjv2, competición .fjv2 fcv2), así que este componente solo emite
// el markup y hereda el estilo compartido, sin CSS propio.
//
// El lado derecho (.s-sub) es la zona de MICRO-RÓTULO. Dos formas:
//   · `scope`  -> chip con borde `.allscope` (ámbito: "Todas las temporadas", "Situación actual"…).
//   · `sub`    -> contenido libre (texto plano "media de puntos por partido", <Echo/>, jornada N…).
// Absorbe aquí los micro-rótulos que quedaron inline al retirar el átomo MicroLabel: ya no se escriben a
// mano en cada ficha. Ver MANUAL_DE_ESTILO.md.

export type SectionHeaderProps = {
  title: ReactNode
  sub?: ReactNode          // lado derecho libre (texto, <Echo/>, etc.)
  scope?: ReactNode        // atajo: envuelve el texto en el chip .allscope (micro-rótulo de ámbito)
  style?: CSSProperties    // override puntual (p.ej. el paddingTop de "Plantilla")
}

export default function SectionHeader({ title, sub, scope, style }: SectionHeaderProps) {
  const right = scope != null ? <span className="allscope">{scope}</span> : sub
  return (
    <div className="s-head" style={style}>
      <h2 className="s-title">{title}</h2>
      {right != null && <div className="s-sub">{right}</div>}
    </div>
  )
}
