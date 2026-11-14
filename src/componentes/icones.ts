// Ícones de traço 1,75, desenhados para 24 × 24. Faltou algum: use o Lucide, que tem o mesmo traço.
export const CAMINHOS = {
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  send: ['M5 12h13', 'M13 6l6 6-6 6'],
  pin: ['M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  casa: ['M4 11l8-7 8 7', 'M6 10v10h12V10'],
  busca: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  carteira: ['M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4z', 'M4 7l11-3v3', 'M16 13.5h.01'],
  mapa: ['M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z', 'M9 4v14', 'M15 6v14'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  relogio: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  alerta: ['M12 4l9 16H3z', 'M12 10v4', 'M12 17h.01'],
  ticket: ['M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z', 'M14 7v10'],
  seta: ['M7 17L17 7', 'M9 7h8v8'],
  mais: ['M12 5v14', 'M5 12h14'],
  menos: ['M5 12h14'],
  fechar: ['M6 6l12 12', 'M18 6L6 18'],
  alvo: [
    'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14z',
    'M12 2v3',
    'M12 19v3',
    'M2 12h3',
    'M19 12h3',
    'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  ],
  // Do Lucide (heart). Contorno fechado: com fill-current, vira o coração cheio do salvo.
  coracao: [
    'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z',
  ],
} as const

export type IconName = keyof typeof CAMINHOS
