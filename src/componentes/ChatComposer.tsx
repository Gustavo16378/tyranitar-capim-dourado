import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

export interface ChatComposerProps {
  placeholder?: string
  /** Texto inicial do campo. Para trocar o texto depois (uma sugestão tocada), mude a key. */
  valor?: string
  /** O campo já abre com o foco e o cursor no fim do texto. */
  focar?: boolean
  /** Envia mesmo com o campo vazio (há uma foto anexada fora dele). */
  permitirVazio?: boolean
  /** Recebe o texto digitado (sem espaços nas pontas, com as quebras de linha) e limpa o campo. */
  onEnviar?: (texto: string) => void
  onFoto?: () => void
  onLink?: () => void
}

const BOTAO = 'grid size-10 flex-none cursor-pointer place-items-center rounded-full border-0'
/** O campo cresce com o texto até este tanto de linhas; depois, rola. */
const LINHAS_NO_MAXIMO = 5
/** Tela de toque (celular): o teclado da tela não tem Shift, então Enter quebra a linha e quem envia é o botão. */
const TOQUE = '(pointer: coarse)'

export function ChatComposer({
  placeholder = 'Pergunte à Capi',
  valor,
  focar,
  permitirVazio,
  onEnviar,
  onFoto,
  onLink,
}: ChatComposerProps) {
  const campo = useRef<HTMLTextAreaElement>(null)
  /** Só na montagem: o foco não volta para o campo a cada render. */
  const focarAoAbrir = useRef(focar)

  /** Altura do texto, até LINHAS_NO_MAXIMO linhas. */
  function ajustarAltura() {
    const el = campo.current
    if (!el) return
    const estilo = getComputedStyle(el)
    const linha = Number.parseFloat(estilo.lineHeight) || 24
    const maximo = linha * LINHAS_NO_MAXIMO + Number.parseFloat(estilo.paddingTop) + Number.parseFloat(estilo.paddingBottom)
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, maximo)}px`
    el.style.overflowY = el.scrollHeight > maximo ? 'auto' : 'hidden'
  }

  // Com um texto inicial, o campo já abre na altura dele (e, se pedido, com o foco no fim).
  useLayoutEffect(() => {
    ajustarAltura()
    const el = campo.current
    if (focarAoAbrir.current && el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [])

  function enviar(evento?: FormEvent) {
    evento?.preventDefault()
    const el = campo.current
    if (!el || !onEnviar) return
    const texto = el.value.trim()
    if (!texto && !permitirVazio) return
    onEnviar(texto)
    el.value = ''
    ajustarAltura()
  }

  // Enter envia e Shift+Enter quebra a linha. Enquanto o teclado compõe um acento, Enter não envia.
  function aoTeclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key !== 'Enter' || evento.shiftKey || evento.nativeEvent.isComposing) return
    if (window.matchMedia(TOQUE).matches) return
    evento.preventDefault()
    enviar()
  }

  return (
    <form
      onSubmit={enviar}
      className={cx(
        // Arredondado como pílula com uma linha; com mais linhas, os botões ficam embaixo.
        'flex w-full items-end gap-2 rounded-[28px] border border-line-strong bg-surface-raised p-2',
        'has-[textarea:focus-visible]:outline has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-focus-ring',
      )}
    >
      <button type="button" aria-label="Enviar foto ou print" onClick={onFoto} className={cx(BOTAO, 'bg-transparent text-ink-muted')}>
        <Icon name="camera" />
      </button>
      <button type="button" aria-label="Colar link de produto" onClick={onLink} className={cx(BOTAO, 'bg-transparent text-ink-muted')}>
        <Icon name="link" />
      </button>
      <textarea
        ref={campo}
        name="mensagem"
        rows={1}
        placeholder={placeholder}
        aria-label="Mensagem para a Capi"
        defaultValue={valor}
        autoComplete="off"
        onInput={ajustarAltura}
        onKeyDown={aoTeclar}
        className="min-h-10 min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-2 py-2 text-body leading-6 text-ink outline-none placeholder:text-ink-muted"
      />
      <button type="submit" aria-label="Enviar" className={cx(BOTAO, 'bg-marrom text-on-marrom')}>
        <Icon name="send" />
      </button>
    </form>
  )
}
