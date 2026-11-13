/**
 * Modo demonstração do app (o pitch). Liga com VITE_MODO_DEMO=1 no .env.local, lido no build
 * (o deploy sobe o dist/ pronto, então vale o .env.local de quem roda o build). Ligado, a Capi abre tocando
 * o roteiro da demonstração (o print do tênis); desligado, abre vazia. É o par do CAPI_MODO_DEMO=1
 * das Functions, que responde o roteiro com as respostas salvas.
 */
export const MODO_DEMO = import.meta.env.VITE_MODO_DEMO === '1'
