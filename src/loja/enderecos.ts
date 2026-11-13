// Endereços do painel. Ficam fora de navegacao.ts (que importa as telas) para uma tela
// poder levar a outra sem import circular: navegar(urlDaTela('atendimento')).

export const BASE_DA_LOJA = '/loja'

/** URL completa de uma tela: urlDaTela('reservas') → '/loja/reservas'. */
export function urlDaTela(caminho: string) {
  return `${BASE_DA_LOJA}/${caminho}`
}

export const URL_INICIAL = urlDaTela('atendimento')
export const URL_DE_ENTRAR = urlDaTela('entrar')
