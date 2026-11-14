// Os créditos da Loja 13: a equipe Tyranitar como os lojistas do andar secreto, e os
// orientadores. Os personagens 2D de cada integrante ficam em
// public/easter-egg/equipe/<nome>-<pose>.png; enquanto o PNG não existir, a tela mostra um avatar
// com a inicial (Personagem.tsx). Os papéis são os do README.

export type Pose = 'acenando' | 'assustado' | 'apontando'

export const POSES: readonly Pose[] = ['acenando', 'assustado', 'apontando']

export interface Integrante {
  nome: string
  papel: string
}

export const EQUIPE: readonly Integrante[] = [
  { nome: 'Gustavo Barbosa Lima', papel: 'Desenvolvimento back-end, Capi (IA) e integração' },
  { nome: 'Gustavo Ferreira', papel: 'Design, front-end e mapa do shopping' },
  { nome: 'Kauã', papel: 'Documentação e modelo de negócio' },
  { nome: 'Diogo', papel: 'Pitch, roteiro e vídeo' },
]

export const ORIENTADORES: readonly string[] = ['Haroldo Soares', 'Paulo Rafael']

/** O nome no arquivo: minúsculas, sem acento, com hífens. "Kauã" → "kaua". */
export function nomeNoArquivo(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** O endereço do PNG do personagem: /easter-egg/equipe/gustavo-ferreira-acenando.png */
export function caminhoDoPersonagem(nome: string, pose: Pose) {
  return `/easter-egg/equipe/${nomeNoArquivo(nome)}-${pose}.png`
}

/** A inicial do avatar sem PNG: a primeira letra do nome, maiúscula. */
export function inicial(nome: string) {
  return nome.trim().charAt(0).toLocaleUpperCase('pt-BR')
}
