import { useCallback, useState, type FormEvent } from 'react'
import { Button, Icon } from '../../../componentes'
import { useEntrada } from '../../../movimento'
import { Campo } from '../../../painel/comum/Campo'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import type { LojaDoShopping } from '../../../tipos/shopping'
import { criarLojista, listarLojistas, useAcao, useConsulta } from '../../api'

/** Quem administra a loja e o cadastro de um lojista novo, com a senha provisória (RF27). */
export function Lojistas({ loja }: { loja: LojaDoShopping }) {
  const ref = useEntrada<HTMLElement>()
  const buscar = useCallback((sinal: AbortSignal) => listarLojistas(loja.id, sinal), [loja.id])
  const consulta = useConsulta(buscar)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const criar = useAcao(criarLojista)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const criado = await criar.executar({ lojaId: loja.id, nome: nome.trim(), email: email.trim() })
    if (!criado) return
    setNome('')
    setEmail('')
    consulta.recarregar()
  }

  return (
    <section
      ref={ref}
      aria-labelledby="titulo-lojistas"
      className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised p-5 md:p-6"
    >
      <div data-anim className="flex flex-col gap-1">
        <h2 id="titulo-lojistas" className="text-title-sm">
          Lojistas
        </h2>
        <p className="text-body-sm text-ink-muted">Quem entra no painel da {loja.nome}.</p>
      </div>

      <div data-anim>
        {consulta.estado === 'carregando' && (
          <Carregando rotulo="Carregando os lojistas">
            <Esqueleto className="h-14" />
          </Carregando>
        )}
        {consulta.estado === 'erro' && <Erro erro={consulta.erro} aoTentarDeNovo={consulta.recarregar} />}
        {consulta.estado === 'pronto' &&
          (consulta.dados.length === 0 ? (
            <Vazio>Ninguém tem acesso ao painel desta loja ainda. Crie o primeiro acesso abaixo.</Vazio>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {consulta.dados.map((lojista) => (
                <li key={lojista.id} className="flex flex-wrap justify-between gap-x-4 py-2 text-body-sm">
                  <span className="font-semibold">{lojista.nome}</span>
                  <span className="text-ink-muted">{lojista.email}</span>
                </li>
              ))}
            </ul>
          ))}
      </div>

      {criar.resultado && (
        <div role="status" className="flex flex-col gap-1 rounded-md bg-cerrado-soft px-4 py-3 text-body-sm text-cerrado-ink">
          <p className="flex items-center gap-2 font-medium">
            <Icon name="check" />
            Acesso criado para {criar.resultado.email}.
          </p>
          <p>
            Senha provisória: <strong className="text-label tracking-wider">{criar.resultado.senhaProvisoria}</strong>.
            Ela aparece só agora: entregue ao lojista pessoalmente.
          </p>
        </div>
      )}

      <form data-anim onSubmit={enviar} noValidate className="flex flex-col gap-4 border-t border-line pt-4">
        <h3 className="text-label">Novo acesso</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" />
          <Campo rotulo="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </div>
        {criar.erro && <Erro erro={criar.erro} />}
        <div>
          <Button type="submit" disabled={criar.enviando}>
            {criar.enviando ? 'Criando…' : 'Criar acesso'}
          </Button>
        </div>
      </form>
    </section>
  )
}
