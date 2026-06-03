export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPlanoPreco(preco: number): string {
  if (preco <= 0) return "Grátis";
  return `${formatBRL(preco)}/mês`;
}
