import { useState, type FormEvent } from 'react'
import { comoErroApi, trocarSenha } from '../api'
import { Button, Icon } from '../componentes'
import { Campo } from './Campo'
import { Folha } from './Folha'

/** Os mesmos 8 caracteres do cadastro (POST /api/auth/cadastro). */
const MINIMO = 8

/**
 * Folha de trocar a senha (Minha conta): pede a atual e a nova duas vezes. A API confere a atual;
 * se ela estiver errada, a mensagem aparece aqui e a sessão continua.
 */
export function FolhaSenha({ aberta, onFechar, onTrocou }: { aberta: boolean; onFechar: () => void; onTrocou: () => void }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [repetida, setRepetida] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)

  function fechar() {
    setAtual('')
    setNova('')
    setRepetida('')
    setProblema(null)
    onFechar()
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    if (!atual) return setProblema('Digite a senha atual.')
    if (nova.length < MINIMO) return setProblema(`A senha nova precisa ter pelo menos ${MINIMO} caracteres.`)
    if (nova !== repetida) return setProblema('As duas senhas novas não são iguais. Digite de novo.')
    setSalvando(true)
    setProblema(null)
    try {
      await trocarSenha(atual, nova)
      fechar()
      onTrocou()
    } catch (falha) {
      setProblema(comoErroApi(falha).mensagem)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Folha aberta={aberta} onFechar={fechar} titulo="Trocar a senha">
      <form noValidate onSubmit={salvar} className="flex flex-col gap-3">
        <Campo
          rotulo="Senha atual"
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
        />
        <Campo
          rotulo="Senha nova"
          type="password"
          autoComplete="new-password"
          aria-describedby="dica-senha-nova"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
        />
        <p id="dica-senha-nova" className="-mt-2 text-body-sm text-ink-muted">
          Pelo menos {MINIMO} caracteres.
        </p>
        <Campo
          rotulo="Repita a senha nova"
          type="password"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
        {problema && (
          <p role="alert" className="flex items-start gap-2 text-body-sm text-perigo-ink">
            <Icon name="alerta" className="mt-px" />
            {problema}
          </p>
        )}
        <div className="flex flex-col gap-2 pt-1">
          <Button type="submit" variant="primary" block disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar senha'}
          </Button>
          <Button block disabled={salvando} onClick={fechar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Folha>
  )
}
