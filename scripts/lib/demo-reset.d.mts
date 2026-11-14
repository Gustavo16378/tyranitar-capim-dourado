export interface ContaDoReset {
  email: string
  comprasDoSeed: string[]
  cuponsDoSeed: string[]
}

export declare function sqlDaLimpeza(conta: ContaDoReset): { contagem: string; comandos: string[] }
export declare function sqlDoSaldo(email: string): string
export declare function sqlDoResumo(conta: { email: string; comprasDoSeed: string[]; emailDoLojista: string }): string[]

export interface ResumoDoReset {
  pontos: number
  compras: number
  nivel: 'SEMENTE' | 'BROTO' | 'CAPIM' | 'DOURADO'
  cupons: string[]
  extrato: { loja: string | null; compras: number; doSeed: number; deOutrosClientes: number; reembolsos: number }
}

export declare function resumoDoReset(linhas: Record<string, unknown>[][]): ResumoDoReset
