import type { ReactNode } from 'react'

// Layout de dos columnas de las fichas de JUGADOR y EQUIPO: barra lateral (aside) + columna principal.
// Unifica el trío .layout/.aside/.main que estaba inline e idéntico en ambas fichas. El CSS vive en
// ficha.css bajo la clase raíz .fjv2:
//   · < 1000px  -> una columna (apila; aside encima del main).
//   · ≥ 1000px  -> grid `360px 1fr`, aside sticky (top:112px) con borde derecho.
// La ficha va topada a 1160px (`.fjv2 { max-width:1160px }`), así que a 1400px+ NO se estira: se centra.
// Por eso el 360/1fr no genera "proporciones desmedidas" en pantallas anchas — el ancho útil es 1160.
// La ficha de COMPETICIÓN NO usa esto (va a ancho completo con `.full`). Ver MANUAL_DE_ESTILO.md.
//
// API compuesta para no envolver ~120 líneas de aside en una prop: se renombra 1:1 el trío de divs.
//   <PageLayout>
//     <PageLayout.Aside>…</PageLayout.Aside>
//     <PageLayout.Main>…</PageLayout.Main>
//   </PageLayout>

export default function PageLayout({ children }: { children: ReactNode }) {
  return <div className="layout">{children}</div>
}

PageLayout.Aside = function PageLayoutAside({ children }: { children: ReactNode }) {
  return <div className="aside">{children}</div>
}

PageLayout.Main = function PageLayoutMain({ children }: { children: ReactNode }) {
  return <div className="main">{children}</div>
}
