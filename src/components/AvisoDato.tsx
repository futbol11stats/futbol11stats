// Aviso de colaboración discreto (ficha de jugador y de equipo): una invitación pequeña a corregir/
// completar datos, con un enlace mailto. No es un banner: texto tenue, tamaño mínimo, al pie del bloque.
export default function AvisoDato({ pre, enlace, post, href, className = '' }: {
  pre: string
  enlace: string
  post: string
  href: string
  className?: string
}) {
  return (
    <p className={`text-[length:var(--t-micro)] text-chalk-600 leading-snug ${className}`}>
      {pre}{' '}
      <a href={href} className="text-grass-400 underline hover:text-grass-300 transition-colors">{enlace}</a>{post}
    </p>
  )
}
