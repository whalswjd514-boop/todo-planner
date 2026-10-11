import mongoose from "mongoose";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalCache = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = (globalCache._mongoose ??= { conn: null, promise: null });

export async function connectDB(uri = process.env.MONGODB_URI ?? process.env.MONGODB_URL): Promise<typeof mongoose> {
  if (!uri) throw new Error("MONGODB_URI is not set (add it to .env.local)");
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(uri, { bufferCommands: false });
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }
  return cache.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cache.conn) await cache.conn.disconnect();
  cache.conn = null;
  cache.promise = null;
}
