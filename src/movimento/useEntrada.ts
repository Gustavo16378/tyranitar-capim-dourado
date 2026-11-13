import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { cascata } from './presets'

/**
 * Entrada em cascata de uma tela: os elementos com o atributo data-anim dentro do ref sobem
 * 24 px e aparecem, um depois do outro (expo.out, 60 ms entre eles). Com movimento reduzido,
 * só um fade de duracao-rapida.
 *
 *   const ref = useEntrada<HTMLDivElement>()
 *   return (
 *     <div ref={ref}>
 *       <h1 data-anim>Sua carteira</h1>
 *       <div data-anim><CarteiraQR ... /></div>
 *     </div>
 *   )
 *
 * Passe dependências para repetir a entrada quando elas mudarem: useEntrada([pago]).
 */
export function useEntrada<T extends HTMLElement = HTMLDivElement>(dependencias: unknown[] = []) {
  const ref = useRef<T>(null)
  useGSAP(
    () => {
      const alvos = ref.current?.querySelectorAll('[data-anim]')
      if (!alvos?.length) return
      const mm = cascata(alvos)
      return () => mm.revert()
    },
    { scope: ref, dependencies: dependencias, revertOnUpdate: true },
  )
  return ref
}
