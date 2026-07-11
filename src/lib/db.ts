import mongoose from 'mongoose'
import { env } from './env'

type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }

const g = globalThis as unknown as { _mongoose?: Cached }
const cached: Cached = g._mongoose ?? { conn: null, promise: null }
g._mongoose = cached

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(env('MONGODB_URI'), { bufferCommands: false })
  }
  try {
    cached.conn = await cached.promise
  } catch (err) {
    // Don't cache a rejected connection promise — otherwise a transient failure
    // (e.g. IP not yet whitelisted) would poison every later attempt on a warm
    // serverless instance. Reset so the next call retries a fresh connection.
    cached.promise = null
    throw err
  }
  return cached.conn
}
