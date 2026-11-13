// Lojas (RF27): as unidades da planta, a loja que funciona em cada uma (ou a vaga) e quem
// administra cada loja.
//
//   TelaLojas            cabeçalho com o resumo das unidades e o modo: lista ou formulário
//   ├─ ResumoDasUnidades GET /api/shopping/lojas (todas): funcionando, vagas e a área vaga
//   ├─ ListaDeLojas      GET /api/shopping/lojas com filtro, busca e paginação
//   └─ FormularioLoja    PUT /api/shopping/lojas/{id} (ocupar vaga, editar, liberar)
//      └─ Lojistas       GET /api/shopping/lojas/{id}/lojistas e POST /api/shopping/lojistas
import { useState } from 'react'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import type { LojaDoShopping } from '../../../tipos/shopping'
import { FormularioLoja } from './FormularioLoja'
import { ListaDeLojas } from './ListaDeLojas'
import { ResumoDasUnidades } from './ResumoDasUnidades'

export function TelaLojas() {
  const ref = useEntrada<HTMLDivElement>()
  const [editando, setEditando] = useState<LojaDoShopping | null>(null)
  const [aviso, setAviso] = useState('')
  // Muda depois de salvar, para o resumo buscar as unidades de novo.
  const [versao, setVersao] = useState(0)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Lojas"
        descricao="As unidades da planta e a loja de cada uma. Para ocupar uma vaga, cadastre a loja que entrou e o acesso do lojista."
      >
        <ResumoDasUnidades key={versao} />
      </CabecalhoTela>

      <p role="status" className={cx('text-body-sm text-cerrado-ink', !aviso && 'sr-only')}>
        {aviso}
      </p>

      <div data-anim>
        {editando ? (
          <FormularioLoja
            key={`${editando.id}-${editando.ativa}`}
            loja={editando}
            aoSalvar={(salva, mensagem) => {
              setAviso(mensagem)
              setVersao((v) => v + 1)
              setEditando(salva.ativa ? salva : null)
            }}
            aoVoltar={() => {
              setAviso('')
              setEditando(null)
            }}
          />
        ) : (
          <ListaDeLojas
            aoEditar={(loja) => {
              setAviso('')
              setEditando(loja)
            }}
          />
        )}
      </div>
    </div>
  )
}
