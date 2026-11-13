// Datas no horário de Palmas (UTC-3, sem horário de verão). O banco guarda UTC.

const PALMAS_MS = -3 * 60 * 60 * 1000

/** A data de hoje em Palmas, no formato do banco para validade: "2026-12-31". */
export function dataEmPalmas(agora: Date): string {
  return new Date(agora.getTime() + PALMAS_MS).toISOString().slice(0, 10)
}

export function somarHoras(data: Date, horas: number): Date {
  return new Date(data.getTime() + horas * 60 * 60 * 1000)
}

/** Data em UTC no formato do datetime('now') do SQLite ("2026-11-13 15:04:05"), para comparar no SQL. */
export function paraSqlite(data: Date): string {
  return data.toISOString().slice(0, 19).replace('T', ' ')
}

/** Lê uma data gravada pelo SQLite (UTC, sem fuso no texto). */
export function deSqlite(texto: string): Date {
  return new Date(`${texto.replace(' ', 'T')}${/[zZ]|[+-]\d\d:\d\d$/.test(texto) ? '' : 'Z'}`)
}
