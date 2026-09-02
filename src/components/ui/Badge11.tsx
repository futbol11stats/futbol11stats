// Sello «11» ÚNICO del sitio (antes: 5 copias inline con tamaños divergentes en FichaJugadorV2, KpiJugador,
// FichaEquipoV2, Panorama). Círculo con «11». Por defecto verde con texto blanco (marca / KPI); en Panorama
// se usa como chip de ELO pasándole `bg` (color del ELO) e `ink` oscuro. El tamaño escala la tipografía.
// Ver MANUAL_DE_ESTILO.md.
export default function Badge11({
  size = 20, bg = '#1a7a3c', ink = '#fff',
}: {
  size?: number
  bg?: string
  ink?: string
}) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: ink,
      display: 'grid', placeItems: 'center', flex: 'none',
      fontFamily: 'var(--font-display), sans-serif', fontWeight: 700,
      fontSize: Math.max(8, Math.round(size * 0.55)), lineHeight: 1,
    }}>11</span>
  )
}
