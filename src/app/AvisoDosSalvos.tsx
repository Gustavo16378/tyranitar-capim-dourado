import { cx } from '../componentes/cx'
import { useSalvos } from './salvos'

/**
 * O aviso do coração, um só para o app (fica no LayoutApp): "Tênis está nos seus salvos." O
 * leitor de tela lê pelo role="status". Salvar e tirar só mudam o coração na tela; o erro, que
 * desfaz o coração, aparece também na tela, acima da barra de navegação.
 */
export function AvisoDosSalvos() {
  const { aviso } = useSalvos()
  return (
    <div role="status" className={cx(aviso?.erro ? 'fixed inset-x-4 bottom-24 z-30 md:bottom-6 md:left-auto md:w-96' : 'sr-only')}>
      {aviso && (
        <p className={cx(aviso.erro && 'rounded-md bg-perigo-soft px-4 py-3 text-body-sm text-perigo-ink shadow-sheet')}>
          {aviso.texto}
        </p>
      )}
    </div>
  )
}
