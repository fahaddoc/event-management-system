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
  cached.conn = await cached.promise
  return cached.conn
}
