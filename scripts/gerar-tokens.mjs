// Gera src/design-system/tokens.css a partir de src/design-system/tokens.json, a fonte única.
// Roda sozinho antes do dev e do build (predev e prebuild). Não edite o tokens.css à mão.
//
// Saída:
// - tema claro em :root, tema escuro em :root[data-theme="dark"] e, seguindo o sistema,
//   em @media (prefers-color-scheme: dark) com :root:not([data-theme="light"]);
// - [data-theme="light"] e [data-theme="dark"] também valem num bloco qualquer da página,
//   para mostrar os dois temas lado a lado (a página /design-system faz isso);
// - variáveis --<nome> para cores, sombras, espaços, raios, durações e easings,
//   --font-display e --font-sans, e --text-<estilo>-* para os estilos de texto.
import { readFileSync, writeFileSync } from 'node:fs'

const pasta = new URL('../src/design-system/', import.meta.url)
const tokens = JSON.parse(readFileSync(new URL('tokens.json', pasta), 'utf8'))

const temas = tokens.color.themes.map((t) => t.id)
for (const tema of ['light', 'dark']) {
  if (!temas.includes(tema)) throw new Error(`tokens.json sem o tema "${tema}"`)
}

// Tokens que mudam com o tema: cores e sombras.
const tematicos = [...tokens.color.tokens, ...tokens.shadow.tokens]
const porNome = new Map(tematicos.map((t) => [t.name, t]))

// Valor de um token num tema. Aceita { light, dark }, texto fixo ou referência "{outro-token}".
function valor(nome, tema, caminho = []) {
  if (caminho.includes(nome)) throw new Error(`Referência circular: ${[...caminho, nome].join(' -> ')}`)
  const token = porNome.get(nome)
  if (!token) throw new Error(`Token "${nome}" não existe (citado por ${caminho.at(-1)})`)
  const v = token.value
  if (typeof v === 'string') {
    const ref = v.match(/^\{(.+)\}$/)
    return ref ? valor(ref[1], tema, [...caminho, nome]) : v
  }
  if (!(tema in v)) throw new Error(`Token "${nome}" sem valor para o tema "${tema}"`)
  return v[tema]
}

const linha = (nome, v) => `  --${nome}: ${v};`
const bloco = (seletor, linhas, recuo = '') =>
  `${recuo}${seletor} {\n${linhas.map((l) => recuo + l).join('\n')}\n${recuo}}`
const doTema = (tema) => [
  `  color-scheme: ${tema};`,
  ...tematicos.map((t) => linha(t.name, valor(t.name, tema))),
]

const estilos = tokens.type.groups.flatMap((grupo) =>
  grupo.styles.map((estilo) => ({ ...estilo, family: grupo.family })),
)
const fixos = [
  ...Object.entries(tokens.type.families).map(([nome, v]) => linha(`font-${nome}`, v)),
  ...estilos.flatMap((e) => [
    linha(`text-${e.name}-family`, `var(--font-${e.family})`),
    linha(`text-${e.name}-size`, e.fontSize),
    linha(`text-${e.name}-leading`, e.lineHeight),
    linha(`text-${e.name}-weight`, e.fontWeight),
    linha(`text-${e.name}-tracking`, e.letterSpacing ?? 'normal'),
  ]),
  ...[tokens.spacing, tokens.radius, tokens.duracao, tokens.easing].flatMap((grupo) =>
    grupo.tokens.map((t) => linha(t.name, t.value)),
  ),
]

const css = [
  '/* Gerado por scripts/gerar-tokens.mjs a partir de tokens.json. Não edite à mão. */',
  bloco(':root', fixos),
  bloco(':root,\n[data-theme="light"]', doTema('light')),
  bloco(':root[data-theme="dark"],\n[data-theme="dark"]', doTema('dark')),
  `@media (prefers-color-scheme: dark) {\n${bloco(':root:not([data-theme="light"])', doTema('dark'), '  ')}\n}`,
  '',
].join('\n\n')

writeFileSync(new URL('tokens.css', pasta), css)
console.log(`tokens.css gerado: ${tematicos.length} tokens com tema, ${fixos.length} fixos.`)
