/**
 * Modo demonstração do app (o pitch). Liga com VITE_MODO_DEMO=1 no build: no .env.local para
 * rodar na máquina, ou nas variáveis de ambiente do Cloudflare Pages. Ligado, a Capi abre tocando
 * o roteiro da demonstração (o print do tênis); desligado, abre vazia. É o par do CAPI_MODO_DEMO=1
 * das Functions, que responde o roteiro com as respostas salvas.
 */
export const MODO_DEMO = import.meta.env.VITE_MODO_DEMO === '1'
