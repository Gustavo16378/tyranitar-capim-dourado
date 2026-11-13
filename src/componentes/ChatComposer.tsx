import type { FormEvent } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

export interface ChatComposerProps {
  placeholder?: string
  /** Texto inicial do campo. */
  valor?: string
  /** Recebe o texto digitado (sem espaços nas pontas) e limpa o campo. */
  onEnviar?: (texto: string) => void
  onFoto?: () => void
  onLink?: () => void
}

const BOTAO = 'grid size-10 flex-none cursor-pointer place-items-center rounded-full border-0'

export function ChatComposer({ placeholder = 'Pergunte à Capi', valor, onEnviar, onFoto, onLink }: ChatComposerProps) {
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const campo = evento.currentTarget.elements.namedItem('mensagem')
    if (!(campo instanceof HTMLInputElement) || !onEnviar) return
    const texto = campo.value.trim()
    if (!texto) return
    onEnviar(texto)
    campo.value = ''
  }

  return (
    <form
      onSubmit={enviar}
      className={cx(
        'flex w-full items-center gap-2 rounded-pill border border-line-strong bg-surface-raised p-2',
        'has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus-ring',
      )}
    >
      <button type="button" aria-label="Enviar foto ou print" onClick={onFoto} className={cx(BOTAO, 'bg-transparent text-ink-muted')}>
        <Icon name="camera" />
      </button>
      <button type="button" aria-label="Colar link de produto" onClick={onLink} className={cx(BOTAO, 'bg-transparent text-ink-muted')}>
        <Icon name="link" />
      </button>
      <input
        type="text"
        name="mensagem"
        placeholder={placeholder}
        aria-label="Mensagem para a Capi"
        defaultValue={valor}
        autoComplete="off"
        className="min-w-0 flex-1 border-0 bg-transparent px-2 text-body text-ink outline-none placeholder:text-ink-muted"
      />
      <button type="submit" aria-label="Enviar" className={cx(BOTAO, 'bg-marrom text-on-marrom')}>
        <Icon name="send" />
      </button>
    </form>
  )
}
