export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatPrice(price: number): string {
  return price > 0 ? `$${price}` : 'Free'
}
