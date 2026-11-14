// GET /api/loja-13: easter egg do tema "O tirano da sexta-feira 13". Os créditos de quem fez o
// app, em JSON. Pública, como /api/saude, e fora das áreas do _middleware: /api/loja/ (com a
// barra) é o painel do lojista, /api/loja-13 não. A LOJA 13 da planta (loja-13 no seed) é outra.
import type { Rota } from '../_lib/contexto'
import { json } from '../_lib/http'

const CREDITOS = {
  equipe: 'Tyranitar',
  tema: 'O tirano da sexta-feira 13',
  evento: 'HackaRun 2026',
  desafio: 'Tema 04: a jornada de compra integrada do Capim Dourado Shopping',
  integrantes: [
    { nome: 'Gustavo Barbosa Lima', papel: 'Desenvolvimento back-end, Capi (IA) e integração' },
    { nome: 'Gustavo Ferreira', papel: 'Design, front-end e mapa do shopping' },
    { nome: 'Kauã', papel: 'Documentação e modelo de negócio' },
    { nome: 'Diogo', papel: 'Pitch, roteiro e vídeo' },
  ],
  orientadores: ['Haroldo Soares', 'Paulo Rafael'],
  recado: 'Esta não é a LOJA 13 do mapa. Aqui não se vende nada: só se agradece.',
}

export const onRequestGet: Rota = () => json(CREDITOS)
