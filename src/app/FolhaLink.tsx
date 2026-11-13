import { useState, type FormEvent } from 'react'
import { linkValido } from '../api'
import { Button, Icon } from '../componentes'
import { Campo } from './Campo'
import { Folha } from './Folha'

export interface FolhaLinkProps {
  aberta: boolean
  onFechar: () => void
  onEnviar: (link: string) => void
}

/** Folha para colar o link de um produto de loja online; a Capi procura parecidos no shopping. */
export function FolhaLink({ aberta, onFechar, onEnviar }: FolhaLinkProps) {
  const [link, setLink] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const podeColar = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function'

  function fechar() {
    setLink('')
    setErro(null)
    onFechar()
  }

  async function colar() {
    try {
      setLink((await navigator.clipboard.readText()).trim())
      setErro(null)
    } catch {
      setErro('Não deu para colar daqui. Toque e segure no campo e escolha Colar.')
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!linkValido(link)) {
      setErro('O link precisa começar com http:// ou https://.')
      return
    }
    onEnviar(link.trim())
    fechar()
  }

  return (
    <Folha aberta={aberta} onFechar={fechar} titulo="Colar link de produto">
      <p className="text-body-sm text-ink-muted">De uma loja online. A Capi procura algo parecido aqui no shopping.</p>
      <form noValidate onSubmit={enviar} className="flex flex-col gap-3">
        <Campo
          rotulo="Link do produto"
          name="link"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://"
          value={link}
          onChange={(evento) => setLink(evento.target.value)}
          aria-invalid={erro ? true : undefined}
        />
        {erro && (
          <p role="alert" className="flex items-start gap-2 text-body-sm text-perigo-ink">
            <Icon name="alerta" className="mt-px" />
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          {podeColar && (
            <Button icon="link" onClick={colar}>
              Colar
            </Button>
          )}
          <Button type="submit" variant="primary" block>
            Enviar link
          </Button>
        </div>
      </form>
    </Folha>
  )
}
