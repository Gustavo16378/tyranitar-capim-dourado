import { lazy, Suspense } from 'react'

// A Loja 13 do easter egg (docs/easter-egg.md) só carrega quando alguém chega nela.
const Loja13 = lazy(() => import('./Loja13'))

export default function Loja13SobDemanda() {
  return (
    <Suspense fallback={null}>
      <Loja13 />
    </Suspense>
  )
}
