// Iconos SVG inline como componentes React. Todos usan `currentColor` (heredan el color del texto del
// contenedor) y aceptan `size` (px, por defecto 14). Las tarjetas son <rect> con `rx`, NUNCA emoji:
// los emoji de tarjeta se dibujan distinto en cada Android y rompen la alineación.

import type { SVGProps } from 'react'

type IconoProps = { size?: number; className?: string } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>

function Svg({ size = 14, children, ...rest }: IconoProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}

// Trazo (contornos): sin relleno, línea currentColor.
const trazo = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

// ---- Camisetas (titular / suplente) ----
export function Camiseta(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M8 3 4 6 6 9l2-1v11h8V8l2 1 2-3-4-3-2 2H10Z" fill="currentColor" />
    </Svg>
  )
}
export function CamisetaHueca(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M8 3 4 6 6 9l2-1v11h8V8l2 1 2-3-4-3-2 2H10Z" {...trazo} />
    </Svg>
  )
}

// ---- Triángulos de tendencia ----
export function TrianguloArriba(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M12 6 20 18H4Z" fill="currentColor" />
    </Svg>
  )
}
export function TrianguloAbajo(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M12 18 4 6h16Z" fill="currentColor" />
    </Svg>
  )
}

export function Guion(p: IconoProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="11" width="14" height="2" rx="1" fill="currentColor" />
    </Svg>
  )
}

// ---- Balón / portero ----
export function Balon(p: IconoProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" {...trazo} />
      <path d="M12 7l4 3-1.5 5h-5L8 10Z" fill="currentColor" />
    </Svg>
  )
}
export function Guante(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M7 21v-6l-2-2a2 2 0 0 1 3-3l1 1V6a1.5 1.5 0 0 1 3 0 1.5 1.5 0 0 1 3 0 1.5 1.5 0 0 1 3 0v9a6 6 0 0 1-6 6Z" {...trazo} />
    </Svg>
  )
}

// ---- Tarjetas: rect con rx, color por currentColor ----
export function TarjetaAmarilla(p: IconoProps) {
  return (
    <Svg {...p}>
      <rect x="7" y="4" width="10" height="16" rx="2" fill="currentColor" />
    </Svg>
  )
}
export function TarjetaDoble(p: IconoProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="5" width="9" height="15" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="11" y="4" width="9" height="15" rx="2" fill="currentColor" />
    </Svg>
  )
}
export function TarjetaRoja(p: IconoProps) {
  return (
    <Svg {...p}>
      <rect x="7" y="4" width="10" height="16" rx="2" fill="currentColor" />
    </Svg>
  )
}

// ---- Local / visitante ----
export function Casa(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M4 11 12 4l8 7" {...trazo} />
      <path d="M6 10v9h12v-9" {...trazo} />
    </Svg>
  )
}
export function Avion(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M2 13l20-7-7 20-3-8Z" {...trazo} />
    </Svg>
  )
}

export function Escudo(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6Z" {...trazo} />
    </Svg>
  )
}
export function Marcador(p: IconoProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="12" rx="2" {...trazo} />
      <path d="M12 6v12" {...trazo} />
    </Svg>
  )
}
export function Tabla(p: IconoProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" {...trazo} />
      <path d="M3 10h18M3 15h18M9 4v16" {...trazo} />
    </Svg>
  )
}
export function Reloj(p: IconoProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" {...trazo} />
      <path d="M12 7v5l3 2" {...trazo} />
    </Svg>
  )
}
export function Estrella(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 15 9l6 .8-4.4 4.2L18 20l-6-3-6 3 1.4-6L3 9.8 9 9Z" fill="currentColor" />
    </Svg>
  )
}
export function Bandera(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M6 21V4" {...trazo} />
      <path d="M6 5h11l-2 4 2 4H6" {...trazo} />
    </Svg>
  )
}
export function Compartir(p: IconoProps) {
  return (
    <Svg {...p}>
      <circle cx="18" cy="5" r="2.5" {...trazo} />
      <circle cx="6" cy="12" r="2.5" {...trazo} />
      <circle cx="18" cy="19" r="2.5" {...trazo} />
      <path d="m8 11 8-5M8 13l8 5" {...trazo} />
    </Svg>
  )
}

// ---- Cambios (entra / sale) ----
export function FlechaEntra(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v16" {...trazo} />
      <path d="M6 10l6-6 6 6" {...trazo} />
    </Svg>
  )
}
export function FlechaSale(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M12 20V4" {...trazo} />
      <path d="M6 14l6 6 6-6" {...trazo} />
    </Svg>
  )
}

export function Promocion(p: IconoProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v18" {...trazo} />
      <path d="M6 9l6-6 6 6" {...trazo} />
      <path d="M6 15l6-6 6 6" {...trazo} />
    </Svg>
  )
}
export function Calendario(p: IconoProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" {...trazo} />
      <path d="M3 9h18M8 3v4M16 3v4" {...trazo} />
    </Svg>
  )
}
