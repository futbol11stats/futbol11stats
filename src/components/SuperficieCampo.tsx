// Superficie del campo con color, en TODOS los sitios donde se pinta (ficha de equipo, ficha de campo,
// resultados de competición, página de club). Recibe la superficie ya parseada (parseCampo -> 'hierba
// artificial' | 'hierba natural' | 'tierra') y la pinta:
//   - Hierba artificial: "Hierba" en VERDE (grass-300, el mismo token del enlace "Cómo llegar" de la ficha de
//     campo) + "artificial" heredando el color del contexto (el de hoy: var(--ink-4) en campo-sup, chalk-600 en
//     las líneas de texto).
//   - Hierba natural: las dos palabras en ese mismo verde.
//   - Tierra: en NARANJA (amber-500, el mismo token del filete de "Juveniles" de la home).
// Sin literales de color: reutiliza los tokens de Tailwind (grass-300 / amber-500). Componente presentacional
// puro (sin estado) -> válido en server components.
export default function SuperficieCampo({ superficie }: { superficie: string | null }) {
  if (!superficie) return null
  switch (superficie.toLowerCase()) {
    case 'hierba artificial':
      return <><span className="text-grass-300">Hierba</span> artificial</>
    case 'hierba natural':
      return <span className="text-grass-300">Hierba natural</span>
    case 'tierra':
      return <span className="text-amber-500">Tierra</span>
    default:
      return <>{superficie}</>
  }
}
