// A aparência do app e dos painéis: Automático (segue o aparelho, o padrão), Claro ou Escuro. A
// escolha fica salva no aparelho (localStorage) e vale para o app e os dois painéis. Sem DOM, para
// os testes de unidade; quem põe o tema na página é aplicarTema.ts, e, antes da primeira pintura,
// o script do index.html, que segue a mesma regra (temaDaPagina).

export type Aparencia = 'automatico' | 'claro' | 'escuro'

export const APARENCIAS: readonly { valor: Aparencia; rotulo: string }[] = [
  { valor: 'automatico', rotulo: 'Automático' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
]

/** A chave no localStorage. O script do index.html lê a mesma. */
export const CHAVE_DA_APARENCIA = 'capi.tema'

/** O que a aparência usa do localStorage (os testes passam um de mentira). */
export interface Armazem {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

export function lerAparencia(armazem: Armazem | undefined): Aparencia {
  try {
    const guardada = armazem?.getItem(CHAVE_DA_APARENCIA)
    return guardada === 'claro' || guardada === 'escuro' ? guardada : 'automatico'
  } catch {
    return 'automatico'
  }
}

/**
 * O data-theme da página: o da escolha, ou nenhum no Automático (aí vale o prefers-color-scheme do
 * aparelho, em tokens.css). Com as luzes apagadas pelo tirano (docs/easter-egg.md), sempre escuro.
 */
export function temaDaPagina(aparencia: Aparencia, tiranoLigado: boolean): 'light' | 'dark' | null {
  if (tiranoLigado || aparencia === 'escuro') return 'dark'
  return aparencia === 'claro' ? 'light' : null
}

export function criarAparencia(armazem: Armazem | undefined) {
  let atual = lerAparencia(armazem)
  const ouvintes = new Set<() => void>()
  return {
    estado: () => atual,
    escolher(nova: Aparencia) {
      if (nova === atual) return
      atual = nova
      try {
        if (nova === 'automatico') armazem?.removeItem(CHAVE_DA_APARENCIA)
        else armazem?.setItem(CHAVE_DA_APARENCIA, nova)
      } catch {
        // Sem onde guardar: a escolha vale até recarregar a página.
      }
      ouvintes.forEach((ouvinte) => ouvinte())
    },
    assinar(ouvinte: () => void) {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
  }
}

function armazemDoAparelho(): Armazem | undefined {
  try {
    return (globalThis as { localStorage?: Armazem }).localStorage
  } catch {
    return undefined
  }
}

/** A aparência escolhida neste aparelho: uma só, para o app e os painéis. */
export const aparencia = criarAparencia(armazemDoAparelho())
