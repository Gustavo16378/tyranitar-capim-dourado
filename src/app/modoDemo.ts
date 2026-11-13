/**
 * Modo demonstração do app (o pitch). Liga com VITE_MODO_DEMO=1 no .env.local, lido no build
 * (o deploy sobe o dist/ pronto, então vale o .env.local de quem roda o build). Ligado, o app avisa
 * que os produtos, preços e buscas são fictícios (AvisoDemonstracao e o selo de Demanda e Lojas
 * vagas). A Capi não manda nada sozinha: a tela vazia tem sugestões que só preenchem o campo.
 */
export const MODO_DEMO = import.meta.env.VITE_MODO_DEMO === '1'
