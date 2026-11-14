// Como os dados da API aparecem nas telas do app (português, fuso de Palmas: RNF11).
import { formatarNumero, formatarPreco } from '../componentes/formatar'
import type { Nivel } from '../componentes/nivel'
import type { NivelApi, Piso, TipoCupom } from '../tipos'

/** Palmas (TO) fica em UTC-3 o ano todo. */
const FUSO = 'America/Araguaina'

/** "Bom dia", "Boa tarde" ou "Boa noite", pela hora de Palmas. */
export function saudacao(agora = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: FUSO }).format(agora),
  )
  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? ''
}

export function nomeDoPiso(piso: Piso) {
  return piso === 1 ? 'Térreo' : '2º piso'
}

/** "2026-12-31" → "31/12" */
export function dataCurta(data: string) {
  const [, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

/** O que vai no canhoto do cupom: "10%", "R$ 20", "Grátis". */
export function descontoDoCupom({ tipo, valor }: { tipo: TipoCupom; valor: number }) {
  if (tipo === 'PERCENTUAL') return `${valor}%`
  if (tipo === 'VALOR') return formatarPreco(valor).replace(/,00$/, '')
  return 'Grátis'
}

/** A API manda o nível em maiúsculas; os componentes usam minúsculas. */
export function paraNivel(nivel: NivelApi): Nivel {
  return nivel.toLowerCase() as Nivel
}

/**
 * Pontos onde cada nível começa (RN08). São os limites iniciais; o shopping pode mudar, e aí a
 * carteira da API precisa mandar o início do nível atual.
 */
export const INICIO_DO_NIVEL: Record<Nivel, number> = { semente: 0, broto: 500, capim: 2000, dourado: 5000 }

/** Tempo até a reserva expirar: "Expira em 4 h", "Expira em 35 min". */
export function prazoDaReserva(expiraEm: string, agora = Date.now()) {
  const minutos = Math.floor((Date.parse(expiraEm) - agora) / 60_000)
  if (minutos <= 0) return 'Prazo vencido'
  if (minutos < 60) return `Expira em ${minutos} min`
  return `Expira em ${Math.round(minutos / 60)} h`
}

/** Prévia de um link na conversa: "loja.com.br" e "/tenis-de-corrida-pulse". */
export function partesDoLink(link: string) {
  try {
    const url = new URL(link)
    const caminho = decodeURIComponent(url.pathname)
    return { site: url.hostname.replace(/^www\./, ''), caminho: caminho === '/' ? 'Página da loja' : caminho }
  } catch {
    return { site: link, caminho: '' }
  }
}

/** Nome do arquivo de GET /api/me/dados: "meus-dados-2026-11-13.json", pela data em que foi gerado. */
export function nomeDoArquivoDeDados(geradoEm: string) {
  return `meus-dados-${geradoEm.slice(0, 10)}.json`
}

/** O dia da compra, em Palmas: "2026-11-12T18:30:00Z" → "12 de nov. de 2026". */
export function dataDaCompra(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: FUSO }).format(
    new Date(iso),
  )
}

/** Os pontos de uma compra: "+339 pontos", "+1 ponto", "Sem pontos" (cupom cobriu tudo). */
export function pontosGanhos(pontos: number) {
  if (pontos === 0) return 'Sem pontos'
  return `+${formatarNumero(pontos)} ${pontos === 1 ? 'ponto' : 'pontos'}`
}
