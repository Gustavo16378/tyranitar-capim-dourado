import { lazy, Suspense } from 'react'
import { Carregando, Esqueleto } from './Estados'

// O mapa 3D (three.js) só carrega quando a pessoa abre o mapa: fica fora do pacote principal.
const Mapa = lazy(() => import('./Mapa'))

/** A tela Mapa, com esqueleto no formato dela enquanto o three.js chega. */
export default function MapaSobDemanda() {
  return (
    <Suspense
      fallback={
        <Carregando className="flex flex-col gap-4 px-4 py-6 md:h-full">
          <Esqueleto className="h-12" />
          <Esqueleto className="h-[58dvh] min-h-[300px] rounded-lg md:h-auto md:flex-1" />
        </Carregando>
      }
    >
      <Mapa />
    </Suspense>
  )
}
