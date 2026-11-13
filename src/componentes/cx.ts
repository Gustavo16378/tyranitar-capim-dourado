/** Junta classes, ignorando as falsas: cx('a', ativo && 'b'). */
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
