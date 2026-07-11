export function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback
  if (v === undefined) throw new Error(`Missing env var: ${key}`)
  return v
}

export const isProd = process.env.NODE_ENV === 'production'
