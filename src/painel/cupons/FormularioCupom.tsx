import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button, CupomTicket, NIVEIS } from '../../componentes'
import { useEntrada } from '../../movimento'
import type { CupomComUso, NivelApi, PedidoCupom, TipoCupom } from '../../tipos'
import { useAcao } from '../api/useAcao'
import { Campo } from '../comum/Campo'
import { Erro } from '../comum/Estados'
import { formatarDia, hojeEmPalmas, lerValorEmCentavos, paraNivel, valorParaCampo } from '../comum/formatos'
import { Opcao } from '../comum/Opcao'
import { Selecao } from '../comum/Selecao'
import type { CategoriaDoShopping } from '../comum/categorias'
import { confirmacaoDoDesconto, textoDoAlvo, textoDoDesconto } from './textos'

const TIPOS: readonly { valor: TipoCupom; rotulo: string }[] = [
  { valor: 'PERCENTUAL', rotulo: 'Porcentagem' },
  { valor: 'VALOR', rotulo: 'Valor em reais' },
  { valor: 'BRINDE', rotulo: 'Brinde' },
]
const NIVEIS_DA_API: readonly NivelApi[] = ['SEMENTE', 'BROTO', 'CAPIM', 'DOURADO']
const TODAS = ''

// O que muda entre o cupom da loja e o voucher do shopping.
const TEXTOS = {
  loja: {
    nome: 'cupom',
    titulo: 'Novo cupom',
    editar: 'Editar cupom',
    exemplo: '10% em calçados',
    todas: 'Toda a loja',
    voltar: 'Voltar aos cupons',
  },
  shopping: {
    nome: 'voucher',
    titulo: 'Novo voucher',
    editar: 'Editar voucher',
    exemplo: 'R$ 20 em qualquer loja',
    todas: 'Qualquer compra',
    voltar: 'Voltar aos vouchers',
  },
} as const

/** O desconto como está no campo: "10" na porcentagem, "20,00" em reais, vazio no brinde. */
function valorNoCampo(tipo: TipoCupom, valor: number) {
  return tipo === 'PERCENTUAL' ? String(valor) : tipo === 'VALOR' ? valorParaCampo(valor) : ''
}

interface FormularioCupomProps {
  /** loja: cupom da loja (RF23). shopping: voucher que vale em qualquer loja (RF28). */
  origem: 'loja' | 'shopping'
  /**
   * A rota que grava: criarCupom ou criarVoucher para um novo; para editar (com `cupom`), a edição
   * dele (editarCupom ou editarVoucher, com o id).
   */
  criar: (pedido: PedidoCupom) => Promise<CupomComUso>
  /** As categorias que o cupom pode mirar. */
  categorias: readonly CategoriaDoShopping[]
  /** O cupom que está sendo editado; sem ele, o formulário cria um novo. */
  cupom?: CupomComUso
  aoCriar: (cupom: CupomComUso) => void
  aoVoltar: () => void
}

/**
 * Novo cupom ou voucher, com a prévia de como ele aparece na carteira do cliente. Com `cupom`, o
 * mesmo formulário edita: já usado ou preso numa reserva, o tipo, o valor, a categoria e o nível
 * ficam travados (a API recusa mudar). Desconto em porcentagem acima de 50% pede confirmação.
 */
export function FormularioCupom({ origem, criar: enviarCupom, categorias, cupom, aoCriar, aoVoltar }: FormularioCupomProps) {
  const textos = TEXTOS[origem]
  const ref = useEntrada<HTMLFormElement>()
  const grupoTipo = useId()
  const idConfirmacao = useId()
  const hoje = hojeEmPalmas()
  const [titulo, setTitulo] = useState(cupom?.titulo ?? '')
  const [tipo, setTipo] = useState<TipoCupom>(cupom?.tipo ?? 'PERCENTUAL')
  const [valor, setValor] = useState(cupom ? valorNoCampo(cupom.tipo, cupom.valor) : '10')
  const [categoriaAlvo, setCategoriaAlvo] = useState(cupom?.categoriaAlvo ?? TODAS)
  const [nivelMinimo, setNivelMinimo] = useState<NivelApi>(cupom?.nivelMinimo ?? 'SEMENTE')
  const [limite, setLimite] = useState(cupom ? String(cupom.limitePorCliente) : '1')
  const [validade, setValidade] = useState(() => cupom?.validade ?? hojeEmPalmas(Date.now() + 30 * 86_400_000))
  const [erros, setErros] = useState<Record<string, string>>({})
  // A pergunta "Este cupom dá 60% de desconto. Confirmar?", enquanto espera a resposta.
  const [confirmacao, setConfirmacao] = useState<string | null>(null)
  const botaoConfirmar = useRef<HTMLButtonElement>(null)
  const criar = useAcao(enviarCupom)
  // Já usado ou numa reserva: só o título, a validade e os usos por cliente mudam.
  const travado = cupom?.emUso ?? false
  // A validade de um cupom já vencido continua valendo se não mudou (para editar o título, por exemplo).
  const validadeAntiga = cupom && cupom.validade < hoje ? cupom.validade : null

  useEffect(() => {
    if (confirmacao) botaoConfirmar.current?.focus()
  }, [confirmacao])

  // O valor como a API quer: porcentagem inteira, centavos ou 0 no brinde.
  const valorLido =
    tipo === 'BRINDE' ? 0 : tipo === 'VALOR' ? lerValorEmCentavos(valor) : /^\d+$/.test(valor.trim()) ? Number(valor) : null

  function ler(): { pedido: PedidoCupom } | { erros: Record<string, string> } {
    const novos: Record<string, string> = {}
    if (titulo.trim().length < 3) novos.titulo = `Escreva o que o ${textos.nome} dá, como "${textos.exemplo}".`
    if (tipo === 'PERCENTUAL' && (valorLido === null || valorLido < 1 || valorLido > 100)) {
      novos.valor = 'Use uma porcentagem de 1 a 100.'
    }
    if (tipo === 'VALOR' && !valorLido) novos.valor = 'Informe o desconto em reais, como 20,00.'
    if (!/^\d+$/.test(limite.trim()) || Number(limite) < 1 || Number(limite) > 99) {
      novos.limite = 'Use de 1 a 99 usos por cliente.'
    }
    if (!validade || (validade < hoje && validade !== validadeAntiga)) novos.validade = 'A validade precisa ser hoje ou depois.'
    if (Object.keys(novos).length || valorLido === null) return { erros: novos }
    return {
      pedido: {
        titulo: titulo.trim(),
        tipo,
        valor: valorLido,
        categoriaAlvo: categoriaAlvo || null,
        nivelMinimo,
        limitePorCliente: Number(limite),
        validade,
      },
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const lido = ler()
    if ('erros' in lido) {
      setErros(lido.erros)
      return
    }
    setErros({})
    const pergunta = confirmacaoDoDesconto(lido.pedido, cupom)
    if (pergunta && !confirmacao) {
      setConfirmacao(pergunta)
      return
    }
    await gravar(lido.pedido)
  }

  async function gravar(pedido: PedidoCupom) {
    setConfirmacao(null)
    const criado = await criar.executar(pedido)
    if (criado) aoCriar(criado)
  }

  /** Mudar o desconto desfaz a confirmação: a pergunta vale para o número que estava. */
  function mudarDesconto(acao: () => void) {
    setConfirmacao(null)
    acao()
  }

  return (
    <form
      ref={ref}
      onSubmit={enviar}
      noValidate
      className="grid items-start gap-6 rounded-md border border-line bg-surface-raised p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="flex flex-col gap-5">
        <h2 data-anim className="text-title-sm">
          {cupom ? textos.editar : textos.titulo}
        </h2>
        {travado && (
          <p data-anim className="rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink-muted">
            Este {textos.nome} já foi usado ou está numa reserva: o tipo, o valor, a categoria e o nível mínimo ficam
            como estão. Dá para mudar o título, a validade e os usos por cliente, ou desativar o {textos.nome}.
          </p>
        )}

        <div data-anim className="flex flex-col gap-4">
          <Campo
            rotulo="Título"
            autoFocus
            placeholder={textos.exemplo}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            erro={erros.titulo}
          />
          <fieldset className="flex flex-col">
            <legend className="mb-1 text-label">Tipo de desconto</legend>
            <div className="flex flex-wrap gap-x-6">
              {TIPOS.map((t) => (
                <Opcao
                  key={t.valor}
                  tipo="radio"
                  name={grupoTipo}
                  checked={tipo === t.valor}
                  disabled={travado}
                  onChange={() =>
                    mudarDesconto(() => {
                      setTipo(t.valor)
                      setValor(t.valor === 'PERCENTUAL' ? '10' : t.valor === 'VALOR' ? '20,00' : '')
                    })
                  }
                >
                  {t.rotulo}
                </Opcao>
              ))}
            </div>
          </fieldset>
          {tipo !== 'BRINDE' && (
            <Campo
              rotulo={tipo === 'PERCENTUAL' ? 'Desconto em %' : 'Desconto em reais'}
              prefixo={tipo === 'VALOR' ? 'R$' : undefined}
              inputMode={tipo === 'VALOR' ? 'decimal' : 'numeric'}
              value={valor}
              disabled={travado}
              onChange={(e) => mudarDesconto(() => setValor(e.target.value))}
              erro={erros.valor}
              className="max-w-[240px]"
            />
          )}
        </div>

        <div data-anim className="grid gap-4 md:grid-cols-2">
          <Selecao
            rotulo="Vale em"
            opcoes={[{ valor: TODAS, rotulo: textos.todas }, ...categorias.map((c) => ({ valor: c.id, rotulo: c.rotulo }))]}
            value={categoriaAlvo}
            disabled={travado}
            onChange={(e) => setCategoriaAlvo(e.target.value)}
            dica={`Com uma categoria, o ${textos.nome} aparece para quem procura por ela.`}
          />
          <Selecao
            rotulo="Nível mínimo"
            opcoes={NIVEIS_DA_API.map((n) => ({ valor: n, rotulo: NIVEIS[paraNivel(n)] }))}
            value={nivelMinimo}
            disabled={travado}
            onChange={(e) => setNivelMinimo(e.target.value as NivelApi)}
          />
          <Campo
            rotulo="Usos por cliente"
            inputMode="numeric"
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            erro={erros.limite}
          />
          <Campo
            rotulo="Vale até"
            type="date"
            min={validadeAntiga ?? hoje}
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
            erro={erros.validade}
          />
        </div>

        <div data-anim className="flex flex-col gap-4">
          {criar.erro && <Erro erro={criar.erro} />}
          {confirmacao ? (
            <div role="group" aria-labelledby={idConfirmacao} className="flex flex-col gap-3 border-t border-line pt-4">
              <p id={idConfirmacao} className="text-body font-semibold">
                {confirmacao}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button ref={botaoConfirmar} type="submit" variant="primary" disabled={criar.enviando}>
                  {criar.enviando ? (cupom ? 'Salvando…' : 'Criando…') : 'Confirmar'}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmacao(null)} disabled={criar.enviando}>
                  Revisar o desconto
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button type="submit" variant="primary" disabled={criar.enviando}>
                {criar.enviando ? (cupom ? 'Salvando…' : 'Criando…') : cupom ? 'Salvar' : `Criar ${textos.nome}`}
              </Button>
              <Button variant="ghost" onClick={aoVoltar} disabled={criar.enviando}>
                {textos.voltar}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Prévia ao vivo: o mesmo CupomTicket da carteira do cliente. */}
      <aside data-anim aria-label="Prévia do cupom" className="flex flex-col gap-2 lg:sticky lg:top-8">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-muted">Como o cliente vê</p>
        <CupomTicket
          origem={origem}
          titulo={titulo.trim() || 'Título do cupom'}
          loja={textoDoAlvo(categoriaAlvo || null)}
          desconto={valorLido === null ? '—' : textoDoDesconto({ tipo, valor: valorLido })}
          validade={validade ? formatarDia(validade) : '—'}
          nivel={nivelMinimo === 'SEMENTE' ? undefined : paraNivel(nivelMinimo)}
        />
      </aside>
    </form>
  )
}
