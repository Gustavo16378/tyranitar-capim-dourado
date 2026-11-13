import type { Config } from 'tailwindcss'

// Os tokens do design system (cores, espaços, raios, fontes, durações e easings)
// entram em theme.extend, cada um apontando para a sua variável CSS.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
