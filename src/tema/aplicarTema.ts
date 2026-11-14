import { modoTirano } from '../easter-egg/modoTirano'
import { aparencia, temaDaPagina } from './aparencia'

/**
 * Põe no <html> o tema da aparência escolhida (ou o escuro do modo tirano) e acompanha as duas:
 * trocar a aparência ou acender as luzes muda a página na hora. Chamado uma vez, no main.tsx; antes
 * dele, o script do index.html já pôs o mesmo tema, então nada pisca ao carregar.
 */
export function aplicarTema(raiz: HTMLElement) {
  const aplicar = () => {
    const tema = temaDaPagina(aparencia.estado(), modoTirano.estado().ligado)
    if (tema) raiz.setAttribute('data-theme', tema)
    else raiz.removeAttribute('data-theme')
  }
  aplicar()
  aparencia.assinar(aplicar)
  modoTirano.assinar(aplicar)
}
