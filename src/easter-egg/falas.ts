// O que o tirano diz. A apresentação é num sábado: a Capi fala da sexta-feira 13 como "ontem", e
// nada depende da data de verdade (docs/easter-egg.md).

/** A resposta da Capi Tirana a "tyranitar", com o botão "Acordar o tirano". */
export const RESPOSTA_DO_TIRANO =
  'GRRR... quer dizer, oi! Ontem foi sexta-feira 13 e eu acordei de mau humor. Quer ver o que acontece quando o tirano acorda?'

/** A mesma palavra com o tirano já acordado. */
export const TIRANO_JA_ACORDADO =
  'GRRR. O tirano já está acordado e as luzes do shopping estão apagadas. Siga as rachaduras no mapa até a Loja 13.'

export const BOTAO_ACORDAR = 'Acordar o tirano'
export const BOTAO_ACENDER = 'Acender as luzes'

/** O que o leitor de tela ouve em cada passo do modo tirano. */
export const AVISOS = {
  apagando: 'O tirano acordou. As luzes estão se apagando.',
  apagadas: 'As luzes se apagaram. Siga as rachaduras no mapa até a Loja 13.',
  acesas: 'As luzes acenderam. O shopping voltou ao normal.',
} as const

/** O recado do Piso 13, que aparece com 13 toques no seletor de piso do mapa. */
export const RECADO_DO_PISO_13 =
  'GRRR. Aqui é o Piso 13, o andar do tirano. Ontem foi sexta-feira 13 e eu ainda estou de mau humor. Volte para o térreo antes que eu acorde de vez.'
