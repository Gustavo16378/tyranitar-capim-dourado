import { useCallback, useEffect, useState, type RefObject } from 'react'
import type { CupomComUso } from '../../tipos'

/**
 * A lista de cupons como está na tela depois de desativar, reativar ou excluir: a resposta da API
 * troca o cartão na hora, sem buscar a lista de novo (o foco fica no botão que foi tocado). O aviso
 * vai para o role="status" da lista (refAviso); depois de excluir, o foco vai para ele, porque o
 * botão saiu junto com o cartão.
 */
export function useCuponsNaTela<T extends CupomComUso>(itens: readonly T[], refAviso: RefObject<HTMLElement | null>) {
  const [mudados, setMudados] = useState<Record<string, T | null>>({})
  const [aviso, setAviso] = useState('')
  const [focarAviso, setFocarAviso] = useState(0)

  useEffect(() => {
    if (focarAviso) refAviso.current?.focus()
  }, [focarAviso, refAviso])

  const lista = itens.flatMap((c) => {
    const mudado = mudados[c.id]
    return mudado === null ? [] : [mudado ?? c]
  })

  const trocar = useCallback((cupom: T, texto: string) => {
    setMudados((m) => ({ ...m, [cupom.id]: cupom }))
    setAviso(texto)
  }, [])

  const tirar = useCallback((cupom: T, texto: string) => {
    setMudados((m) => ({ ...m, [cupom.id]: null }))
    setAviso(texto)
    setFocarAviso((n) => n + 1)
  }, [])

  return { lista, aviso, trocar, tirar }
}
