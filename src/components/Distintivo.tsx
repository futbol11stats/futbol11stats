// Distintivo de la marca: círculo grass-500 con el «11» en TRAZADOS (no texto), contorno del «1» de Barlow
// Condensed 800 y centrado por los palos, no por la caja del texto. Es el mismo dibujo que favicon, icon.png,
// apple-icon y og (maestro: archivo/marca/distintivo.svg); el favicon de 16/32 px es una versión a mano de él.
export default function Distintivo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <circle cx="256" cy="256" r="256" className="fill-grass-500" />
      <path className="fill-white" d="M173.57 138.24L225.38 138.24L228.41 141.27L228.41 370.40L225.38 373.76L175.59 373.76L172.56 370.40L172.56 192.07L144.63 191.74L141.94 189.38L141.27 161.46L141.27 151.70L142.95 149.01ZM284.60 138.24L336.41 138.24L339.44 141.27L339.44 370.40L336.41 373.76L286.62 373.76L283.59 370.40L283.59 192.07L255.66 191.74L252.97 189.38L252.30 161.46L252.30 151.70L253.98 149.01Z" />
    </svg>
  )
}
