// Datas no horário de Palmas (UTC-3, sem horário de verão). O banco guarda UTC.

const PALMAS_MS = -3 * 60 * 60 * 1000

/** A data de hoje em Palmas, no formato do banco para validade: "2026-12-31". */
export function dataEmPalmas(agora: Date): string {
  return new Date(agora.getTime() + PALMAS_MS).toISOString().slice(0, 10)
}

export function somarHoras(data: Date, horas: number): Date {
  return new Date(data.getTime() + horas * 60 * 60 * 1000)
}
