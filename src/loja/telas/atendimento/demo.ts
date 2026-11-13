// Dados do botão "Simular leitura", para a demonstração sem câmera.

/**
 * O qr_token da Ana no seed: "q-" + os 24 primeiros hex de sha256("qr:ana.souza@demo.test")
 * (scripts/gerar-seed.mjs). Funciona com o mock e com a API real. Se o seed mudar a regra
 * do token, atualize aqui.
 */
export const QR_DA_ANA = 'q-e08f6d74302d293349fda714'

/** Valor que já vem no caixa na leitura simulada, o mesmo do protótipo (R$ 459,80). */
export const VALOR_DA_DEMO = 45980
