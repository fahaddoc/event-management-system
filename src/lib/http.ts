import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ServiceError } from './services/errors'

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status })
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof ZodError) return json({ error: 'Invalid input', details: err.issues }, 400)
  if (err instanceof ServiceError) return json({ error: err.message }, err.status)
  console.error(err)
  return json({ error: 'Internal error' }, 500)
}
