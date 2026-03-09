export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < SEVEN_DAYS_MS
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString('ru-RU')} ₽`
}
