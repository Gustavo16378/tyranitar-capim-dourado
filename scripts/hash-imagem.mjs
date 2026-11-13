// SHA-256 de uma foto do pitch, para pôr em imagensSha256 no
// functions/_lib/capi/demonstracao.json:   node scripts/hash-imagem.mjs foto.jpg
// Use a foto exatamente como o app envia (depois de reduzida). Com CAPI_MODO_DEMO=1, o log da
// Capi também mostra o SHA-256 de cada foto recebida.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const arquivos = process.argv.slice(2)
if (!arquivos.length) {
  console.error('Uso: node scripts/hash-imagem.mjs foto.jpg [outra.png ...]')
  process.exit(1)
}
for (const arquivo of arquivos) {
  console.log(`${createHash('sha256').update(readFileSync(arquivo)).digest('hex')}  ${arquivo}`)
}
