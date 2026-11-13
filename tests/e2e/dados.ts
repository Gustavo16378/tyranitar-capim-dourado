// Os dados fixos dos testes no navegador (tests/e2e/dados.json), com tipo.
import { readFileSync } from 'node:fs'

export interface DadosDosTestes {
  porta: number
  ana: { email: string; qrToken: string }
  lojista: { email: string; senha: string }
  carla: { email: string; senha: string; qrToken: string }
  admin: { email: string; senha: string }
  mapaDaLojaA: string
  jwtSecret: string
}

const lidos: DadosDosTestes = JSON.parse(readFileSync(new URL('./dados.json', import.meta.url), 'utf8'))

/**
 * Com E2E_PORTA, o site dos testes sobe em outra porta: duas cópias do projeto (dois worktrees,
 * por exemplo) podem rodar os testes no navegador ao mesmo tempo na mesma máquina.
 */
export const dados: DadosDosTestes = { ...lidos, porta: Number(process.env.E2E_PORTA) || lidos.porta }
