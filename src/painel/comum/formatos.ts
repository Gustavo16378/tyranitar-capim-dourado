// Conversões entre o formato da API e o que os componentes e o lojista leem.
// Importa dos arquivos .ts dos componentes (não do index, que traz os .tsx) para os testes
// de unidade, que rodam sem JSX, poderem usar este arquivo.
import { formatarPreco } from '../../componentes/formatar'
import type { Nivel } from '../../componentes/nivel'
import type { NivelApi } from '../../tipos'

/** A API escreve CAPIM; os componentes recebem capim. */
export function paraNivel(nivel: NivelApi): Nivel {
  return nivel.toLowerCase() as Nivel
}

/**
 * O que o caixa digita, em centavos: "459,80", "459.80", "R$ 1.234,56", "1234".
 * Devolve null se não for um valor em reais.
 */
export function lerValorEmCentavos(texto: string): number | null {
  let limpo = texto.replace(/R\$/i, '').replace(/\s/g, '')
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) limpo = limpo.replace(/\./g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null
  return Math.round(Number(limpo) * 100)
}

// Palmas fica em UTC-3, sem horário de verão: o mesmo fuso de Araguaína (RNF11).
const EM_PALMAS = { timeZone: 'America/Araguaina' } as const
const DATA_CURTA = new Intl.DateTimeFormat('pt-BR', { ...EM_PALMAS, day: '2-digit', month: '2-digit' })
const DATA_E_HORA = new Intl.DateTimeFormat('pt-BR', {
  ...EM_PALMAS,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** Hoje em Palmas, no formato das validades: "2026-11-13". */
export function hojeEmPalmas(agora = Date.now()) {
  return new Date(agora - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Dias de hoje até um dia "2026-12-31": 0 é hoje, negativo já passou. */
export function diasAte(dia: string, hoje: string) {
  return Math.round((Date.parse(`${dia}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000)
}

/** "2026-11-14T18:00:00Z" → "14/11, 15:00" (hora de Palmas). */
export function formatarDataHora(iso: string) {
  return DATA_E_HORA.format(new Date(iso))
}

/** "2026-11-14T02:00:00Z" (um instante) → "13/11", o dia em Palmas. */
export function formatarData(iso: string) {
  return DATA_CURTA.format(new Date(iso))
}

/** "2026-12-31" (dia, sem hora) → "31/12". */
export function formatarDia(dia: string) {
  return DATA_CURTA.format(new Date(`${dia}T12:00:00-03:00`))
}

/** Quanto falta para o prazo: "Expira em 40 min", "Expira em 3 h", "Prazo vencido". */
export function prazoRestante(iso: string, agora: number) {
  const minutos = Math.floor((new Date(iso).getTime() - agora) / 60_000)
  if (minutos <= 0) return 'Prazo vencido'
  if (minutos < 60) return `Expira em ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 48) return `Expira em ${horas} h`
  return `Expira em ${Math.floor(horas / 24)} dias`
}

const AREA = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** 229.9 → "229,9 m²". */
export function formatarArea(m2: number) {
  return `${AREA.format(m2)} m²`
}

/** 1 → "Térreo", 2 → "2º piso". */
export function rotuloDoPiso(piso: number) {
  return piso === 1 ? 'Térreo' : `${piso}º piso`
}

/** "12345678000190" (ou já com pontos) → "12.345.678/0001-90". Incompleto volta só com os dígitos. */
export function formatarCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return d
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** 45980 → "459,80": o valor no campo, sem o "R$" (que já está no prefixo). */
export function valorParaCampo(centavos: number) {
  return formatarPreco(centavos).replace('R$ ', '')
}
