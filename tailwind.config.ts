import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import tokens from './src/design-system/tokens.json'

// Cada classe aponta para a variável CSS do token (gerada em src/design-system/tokens.css).
// Os nomes saem do tokens.json: token novo vira classe sem mexer aqui.
//
// Cores, fontes, estilos de texto, sombras, durações e curvas substituem os padrões do
// Tailwind: o que não é token não vira classe (bg-red-500, text-lg e shadow-xl não existem).
// Espaços e raios estendem os padrões: space-1..12 e radius-sm..pill sobrescrevem as mesmas
// chaves, e os tamanhos do Tailwind (h-11 = 44 px, alvo de toque) continuam disponíveis.

const variavel = (nome: string) => `var(--${nome})`

function classes(lista: { name: string }[], prefixo = '') {
  return Object.fromEntries(lista.map((t) => [t.name.replace(prefixo, ''), variavel(t.name)]))
}

// Os 10 estilos de texto (text-display, text-title-lg ... text-metric): família, tamanho,
// entrelinha, peso e espaçamento numa classe só. Preço e métrica usam algarismos tabulares.
const ALGARISMOS_TABULARES = new Set(['price', 'metric'])
const estilosDeTexto = plugin(({ addComponents }) => {
  const estilos = tokens.type.groups.flatMap((grupo) => grupo.styles)
  addComponents(
    Object.fromEntries(
      estilos.map(({ name }) => [
        `.text-${name}`,
        {
          fontFamily: variavel(`text-${name}-family`),
          fontSize: variavel(`text-${name}-size`),
          lineHeight: variavel(`text-${name}-leading`),
          fontWeight: variavel(`text-${name}-weight`),
          letterSpacing: variavel(`text-${name}-tracking`),
          ...(ALGARISMOS_TABULARES.has(name) ? { fontVariantNumeric: 'tabular-nums' } : {}),
        },
      ]),
    ),
  )
})

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      ...classes(tokens.color.tokens),
    },
    fontFamily: { display: variavel('font-display'), sans: variavel('font-sans') },
    fontSize: {},
    boxShadow: { none: 'none', ...classes(tokens.shadow.tokens, 'shadow-') },
    transitionDuration: {
      DEFAULT: variavel('duracao-instante'),
      ...classes(tokens.duracao.tokens, 'duracao-'),
    },
    transitionTimingFunction: {
      DEFAULT: variavel('ease-saida'),
      ...classes(tokens.easing.tokens, 'ease-'),
    },
    extend: {
      spacing: classes(tokens.spacing.tokens, 'space-'),
      borderRadius: classes(tokens.radius.tokens, 'radius-'),
      borderColor: { DEFAULT: variavel('line') },
      keyframes: {
        digitando: { '0%, 80%, 100%': { opacity: '0.3' }, '40%': { opacity: '1' } },
      },
      animation: {
        // Laço dos três pontos de "Capi está digitando", igual ao do design system.
        digitando: 'digitando 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [estilosDeTexto],
} satisfies Config
