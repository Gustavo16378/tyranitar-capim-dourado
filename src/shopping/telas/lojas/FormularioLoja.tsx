import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import { Campo } from '../../../painel/comum/Campo'
import { CATEGORIAS_DO_SHOPPING } from '../../../painel/comum/categorias'
import { Erro } from '../../../painel/comum/Estados'
import { formatarArea, formatarCnpj, rotuloDoPiso } from '../../../painel/comum/formatos'
import { Opcao } from '../../../painel/comum/Opcao'
import type { LojaDoShopping, PedidoLoja, TipoDeLoja } from '../../../tipos/shopping'
import { editarLoja, useAcao } from '../../api'
import { Lojistas } from './Lojistas'

interface FormularioLojaProps {
  loja: LojaDoShopping
  /** Salvou: a loja como ficou e a frase para anunciar. */
  aoSalvar: (loja: LojaDoShopping, mensagem: string) => void
  aoVoltar: () => void
}

/** Ocupar uma vaga, editar a loja ou liberar a unidade (RF27). */
export function FormularioLoja({ loja, aoSalvar, aoVoltar }: FormularioLojaProps) {
  const ref = useEntrada<HTMLDivElement>()
  const grupoTipo = useId()
  const eraVaga = !loja.ativa
  const [nome, setNome] = useState(eraVaga ? '' : loja.nome)
  const [cnpj, setCnpj] = useState(loja.cnpj ? formatarCnpj(loja.cnpj) : '')
  const [tipo, setTipo] = useState<TipoDeLoja>(loja.tipo)
  const [categorias, setCategorias] = useState<string[]>(loja.categorias)
  const [ativa, setAtiva] = useState(true)
  const [erros, setErros] = useState<Record<string, string>>({})
  const salvar = useAcao((pedido: PedidoLoja) => editarLoja(loja.id, pedido))

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const novos: Record<string, string> = {}
    if (ativa && nome.trim().length < 2) novos.nome = 'Escreva o nome da loja.'
    if (ativa && cnpj.replace(/\D/g, '').length !== 14) novos.cnpj = 'O CNPJ tem 14 dígitos, como 12.345.678/0001-90.'
    setErros(novos)
    if (Object.keys(novos).length) return
    const salva = await salvar.executar({ nome: nome.trim(), cnpj: ativa ? cnpj : null, tipo, categorias, ativa })
    if (!salva) return
    const mensagem = !salva.ativa
      ? `A ${loja.unidade} voltou a ser vaga.`
      : eraVaga
        ? `${salva.nome} agora ocupa a ${loja.unidade}. Crie o acesso do lojista abaixo.`
        : `${salva.nome} salva.`
    aoSalvar(salva, mensagem)
  }

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <form
        data-anim
        onSubmit={enviar}
        noValidate
        className="flex flex-col gap-5 rounded-md border border-line bg-surface-raised p-5 md:p-6"
      >
        <div className="flex flex-col gap-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-muted">
            {loja.unidade} · {rotuloDoPiso(loja.piso)}
            {loja.areaM2 ? ` · ${formatarArea(loja.areaM2)}` : ''}
          </p>
          <h2 className="text-title-sm">{eraVaga ? 'Ocupar a vaga' : `Editar ${loja.nome}`}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo
            rotulo="Nome da loja"
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            erro={erros.nome}
            disabled={!ativa}
          />
          <Campo
            rotulo="CNPJ"
            inputMode="numeric"
            placeholder="12.345.678/0001-90"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            onBlur={() => setCnpj(formatarCnpj(cnpj))}
            erro={erros.cnpj}
            dica="O mesmo das notas fiscais: é por ele que a nota lida no app acha a loja."
            disabled={!ativa}
          />
        </div>

        <fieldset className="flex flex-col" disabled={!ativa}>
          <legend className="mb-1 text-label">Tipo</legend>
          <div className="flex flex-wrap gap-x-6">
            <Opcao tipo="radio" name={grupoTipo} checked={tipo === 'loja'} onChange={() => setTipo('loja')}>
              Loja
            </Opcao>
            <Opcao tipo="radio" name={grupoTipo} checked={tipo === 'alimentacao'} onChange={() => setTipo('alimentacao')}>
              Alimentação
            </Opcao>
          </div>
        </fieldset>

        <fieldset className="flex flex-col" disabled={!ativa}>
          <legend className="mb-1 text-label">O que a loja vende</legend>
          <p className="mb-1 text-body-sm text-ink-muted">A ficha do cliente só mostra ao lojista os interesses destas categorias.</p>
          <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIAS_DO_SHOPPING.map((c) => (
              <Opcao
                key={c.id}
                tipo="checkbox"
                checked={categorias.includes(c.id)}
                onChange={(e) =>
                  setCategorias(e.target.checked ? [...categorias, c.id] : categorias.filter((id) => id !== c.id))
                }
              >
                {c.rotulo}
              </Opcao>
            ))}
          </div>
        </fieldset>

        {!eraVaga && (
          <div className="flex flex-col gap-2">
            <Opcao tipo="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)}>
              Loja funcionando na unidade
            </Opcao>
            {!ativa && (
              <p className="rounded-sm bg-perigo-soft p-3 text-body-sm text-perigo-ink">
                Ao salvar, a {loja.unidade} volta a ser vaga e os lojistas desta loja perdem o acesso ao painel.
              </p>
            )}
          </div>
        )}

        {salvar.erro && <Erro erro={salvar.erro} />}
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button type="submit" variant={ativa ? 'primary' : 'danger'} disabled={salvar.enviando}>
            {salvar.enviando ? 'Salvando…' : !ativa ? 'Liberar a unidade' : eraVaga ? 'Ocupar a vaga' : 'Salvar loja'}
          </Button>
          <Button variant="ghost" onClick={aoVoltar} disabled={salvar.enviando}>
            Voltar às lojas
          </Button>
        </div>
      </form>

      {!eraVaga && <Lojistas loja={loja} />}
    </div>
  )
}
