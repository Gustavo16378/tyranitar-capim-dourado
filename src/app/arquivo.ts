// Salvar um arquivo no aparelho a partir de dados que o app já tem (o navegador baixa).

/** Baixa `dados` como um arquivo JSON legível (com recuo), com o nome dado. */
export function salvarJson(nome: string, dados: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  // Depois do clique o navegador já tem o arquivo; o endereço temporário pode ir embora.
  setTimeout(() => URL.revokeObjectURL(url))
}
