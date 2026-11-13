// Endereços do painel do shopping. Ficam fora de navegacao.ts (que importa as telas) para uma
// tela poder levar a outra sem import circular: navegar(urlDaTela('vagas')).

export const BASE_DO_SHOPPING = '/shopping'

/** URL completa de uma tela: urlDaTela('vagas') → '/shopping/vagas'. */
export function urlDaTela(caminho: string) {
  return `${BASE_DO_SHOPPING}/${caminho}`
}
