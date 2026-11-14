// A hora em que a reserva fica pronta, no horário de Palmas (UTC-3, sem horário de verão). A loja
// digita "HH:MM" ao confirmar; a API transforma em data com a mesma regra de quandoFicaPronta()
// (functions/_lib/regras/reserva.ts › prontaAPartirDe). Aqui ela serve para a tela dizer antes de
// enviar se é hoje ou amanhã. Sem DOM: testado em tests/unidade/loja-reservas.test.ts.

const PALMAS_MS = -3 * 60 * 60 * 1000
const MEIA_HORA_MS = 30 * 60 * 1000
const UMA_HORA_MS = 60 * 60 * 1000

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** Um instante (ms ou ISO) como "15:30", em Palmas. */
export function horaEmPalmas(instante: number | string) {
  const local = new Date((typeof instante === 'string' ? Date.parse(instante) : instante) + PALMAS_MS)
  return `${doisDigitos(local.getUTCHours())}:${doisDigitos(local.getUTCMinutes())}`
}

/**
 * A próxima meia hora cheia depois de agora, em Palmas: 14:10 → "14:30"; 14:30 → "15:00";
 * 23:50 → "00:00" (amanhã). É a hora que já vem no campo ao confirmar.
 */
export function proximaMeiaHora(agora: number) {
  return horaEmPalmas(Math.floor(agora / MEIA_HORA_MS) * MEIA_HORA_MS + MEIA_HORA_MS)
}

export interface HoraPronta {
  /** O instante em ms. */
  instante: number
  /** Fica para amanhã: a hora já tinha passado há mais de uma hora. */
  amanha: boolean
  /** A hora já passou há pouco (menos de uma hora): fica pronta agora. */
  jaPassou: boolean
}

/**
 * Quando a reserva fica pronta com o "HH:MM" que a loja digitou, como a API calcula: hoje; amanhã
 * se a hora já passou há mais de uma hora (a loja confirmou de noite para a manhã); agora se
 * passou há menos. null se não for uma hora no formato HH:MM.
 */
export function quandoFicaPronta(horaMinuto: string, agora: number): HoraPronta | null {
  const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horaMinuto.trim())
  if (!partes) return null
  const local = new Date(agora + PALMAS_MS)
  const hoje =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), Number(partes[1]), Number(partes[2])) -
    PALMAS_MS
  if (hoje < agora - UMA_HORA_MS) return { instante: hoje + 24 * UMA_HORA_MS, amanha: true, jaPassou: false }
  return hoje <= agora ? { instante: agora, amanha: false, jaPassou: true } : { instante: hoje, amanha: false, jaPassou: false }
}

/** A frase embaixo do campo da hora: "Hoje, a partir das 15:30.", "Amanhã, a partir das 09:00." */
export function fraseDaHoraPronta(horaMinuto: string, agora: number) {
  const pronta = quandoFicaPronta(horaMinuto, agora)
  if (!pronta) return null
  if (pronta.jaPassou) return 'Essa hora já passou: a reserva fica pronta agora.'
  return `${pronta.amanha ? 'Amanhã' : 'Hoje'}, a partir das ${horaEmPalmas(pronta.instante)}.`
}
