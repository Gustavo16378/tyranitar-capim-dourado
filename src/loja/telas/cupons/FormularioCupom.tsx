import { useId, useState, type FormEvent } from 'react'
import { Button, CupomTicket, NIVEIS } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import type { CupomDaLoja, NivelApi, PedidoCupom, TipoCupom } from '../../../tipos/loja'
import { criarCupom, useAcao } from '../../api'
import { Campo } from '../../../painel/comum/Campo'
import { Erro } from '../../../painel/comum/Estados'
import { formatarDia, hojeEmPalmas, lerValorEmCentavos, paraNivel } from '../../../painel/comum/formatos'
import { Opcao } from '../../../painel/comum/Opcao'
import { Selecao } from '../../../painel/comum/Selecao'
import { CATEGORIAS, rotuloDaCategoria } from '../produtos/categorias'
import { textoDoDesconto } from './textos'

const TIPOS: readonly { valor: TipoCupom; rotulo: string }[] = [
  { valor: 'PERCENTUAL', rotulo: 'Porcentagem' },
  { valor: 'VALOR', rotulo: 'Valor em reais' },
  { valor: 'BRINDE', rotulo: 'Brinde' },
]
const NIVEIS_DA_API: readonly NivelApi[] = ['SEMENTE', 'BROTO', 'CAPIM', 'DOURADO']
const TODAS = ''

interface FormularioCupomProps {
  aoCriar: (cupom: CupomDaLoja) => void
  aoVoltar: () => void
}

/** Novo cupom da loja (RF23), com a prévia de como ele aparece na carteira do cliente. */
export function FormularioCupom({ aoCriar, aoVoltar }: FormularioCupomProps) {
  const ref = useEntrada<HTMLFormElement>()
  const grupoTipo = useId()
  const hoje = hojeEmPalmas()
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoCupom>('PERCENTUAL')
  const [valor, setValor] = useState('10')
  const [categoriaAlvo, setCategoriaAlvo] = useState(TODAS)
  const [nivelMinimo, setNivelMinimo] = useState<NivelApi>('SEMENTE')
  const [limite, setLimite] = useState('1')
  const [validade, setValidade] = useState(() => hojeEmPalmas(Date.now() + 30 * 86_400_000))
  const [erros, setErros] = useState<Record<string, string>>({})
  const criar = useAcao(criarCupom)

  // O valor como a API quer: porcentagem inteira, centavos ou 0 no brinde.
  const valorLido =
    tipo === 'BRINDE' ? 0 : tipo === 'VALOR' ? lerValorEmCentavos(valor) : /^\d+$/.test(valor.trim()) ? Number(valor) : null

  function ler(): { pedido: PedidoCupom } | { erros: Record<string, string> } {
    const novos: Record<string, string> = {}
    if (titulo.trim().length < 3) novos.titulo = 'Escreva o que o cupom dá, como "10% em calçados".'
    if (tipo === 'PERCENTUAL' && (valorLido === null || valorLido < 1 || valorLido > 100)) {
      novos.valor = 'Use uma porcentagem de 1 a 100.'
    }
    if (tipo === 'VALOR' && !valorLido) novos.valor = 'Informe o desconto em reais, como 20,00.'
    if (!/^\d+$/.test(limite.trim()) || Number(limite) < 1 || Number(limite) > 99) {
      novos.limite = 'Use de 1 a 99 usos por cliente.'
    }
    if (!validade || validade < hoje) novos.validade = 'A validade precisa ser hoje ou depois.'
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
    const criado = await criar.executar(lido.pedido)
    if (criado) aoCriar(criado)
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
          Novo cupom
        </h2>

        <div data-anim className="flex flex-col gap-4">
          <Campo
            rotulo="Título"
            autoFocus
            placeholder="10% em calçados"
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
                  onChange={() => {
                    setTipo(t.valor)
                    setValor(t.valor === 'PERCENTUAL' ? '10' : t.valor === 'VALOR' ? '20,00' : '')
                  }}
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
              onChange={(e) => setValor(e.target.value)}
              erro={erros.valor}
              className="max-w-[240px]"
            />
          )}
        </div>

        <div data-anim className="grid gap-4 md:grid-cols-2">
          <Selecao
            rotulo="Vale em"
            opcoes={[{ valor: TODAS, rotulo: 'Toda a loja' }, ...CATEGORIAS.map((c) => ({ valor: c.id, rotulo: c.rotulo }))]}
            value={categoriaAlvo}
            onChange={(e) => setCategoriaAlvo(e.target.value)}
            dica="Com uma categoria, o cupom aparece para quem procura por ela."
          />
          <Selecao
            rotulo="Nível mínimo"
            opcoes={NIVEIS_DA_API.map((n) => ({ valor: n, rotulo: NIVEIS[paraNivel(n)] }))}
            value={nivelMinimo}
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
            min={hoje}
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
            erro={erros.validade}
          />
        </div>

        <div data-anim className="flex flex-col gap-4">
          {criar.erro && <Erro erro={criar.erro} />}
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button type="submit" variant="primary" disabled={criar.enviando}>
              {criar.enviando ? 'Criando…' : 'Criar cupom'}
            </Button>
            <Button variant="ghost" onClick={aoVoltar} disabled={criar.enviando}>
              Voltar aos cupons
            </Button>
          </div>
        </div>
      </div>

      {/* Prévia ao vivo: o mesmo CupomTicket da carteira do cliente. */}
      <aside data-anim aria-label="Prévia do cupom" className="flex flex-col gap-2 lg:sticky lg:top-8">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-muted">Como o cliente vê</p>
        <CupomTicket
          origem="loja"
          titulo={titulo.trim() || 'Título do cupom'}
          loja={categoriaAlvo ? `Em ${rotuloDaCategoria(categoriaAlvo).toLowerCase()}` : 'Na loja toda'}
          desconto={valorLido === null ? '—' : textoDoDesconto({ tipo, valor: valorLido })}
          validade={validade ? formatarDia(validade) : '—'}
          nivel={nivelMinimo === 'SEMENTE' ? undefined : paraNivel(nivelMinimo)}
        />
      </aside>
    </form>
  )
}
