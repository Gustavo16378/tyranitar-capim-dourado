// Os dados fixos dos testes no navegador (tests/e2e/dados.json), com tipo.
import { readFileSync } from 'node:fs'

export interface DadosDosTestes {
  porta: number
  ana: { email: string; qrToken: string }
  lojista: { email: string; senha: string }
  mapaDaLojaA: string
  jwtSecret: string
}

export const dados: DadosDosTestes = JSON.parse(readFileSync(new URL('./dados.json', import.meta.url), 'utf8'))
