// Capa de almacenamiento compartida: Postgres (Neon/DATABASE_URL) en producción,
// archivo JSON local en desarrollo. Una sola lógica para server.ts y Vercel serverless.
import fs from 'fs';
import path from 'path';

function databaseUrl(): string {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

export function usePg(): boolean {
  return Boolean(databaseUrl());
}

export const USE_PG = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

let sqlClient: any = null;
async function sql() {
  if (!sqlClient) {
    const { neon } = await import('@neondatabase/serverless');
    sqlClient = neon(databaseUrl());
  }
  return sqlClient;
}

export async function ensureSchema(): Promise<void> {
  if (!databaseUrl()) return;
  const db = await sql();
  await db`CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

// ---------- Fallback archivo local ----------
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cloud_db.json');

export interface DbShape {
  products: any[];
  orders: any[];
  users: any[];
  adminPin: string;
  stockAlerts: any[];
  settings: any | null;
  distributors: any[];
}

function defaultDb(): DbShape {
  return {
    products: [],
    orders: [],
    users: [
      { id: 'admin-1', email: 'admin@lajuaquina.com', name: 'Administrador La Juaquina', role: 'admin' },
    ],
    adminPin: 'admin123',
    stockAlerts: [],
    settings: null,
    distributors: [],
  };
}

let fileCache: DbShape | null = null;

function loadFile(): DbShape {
  if (fileCache) return fileCache;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      fileCache = { ...defaultDb(), ...parsed };
      if (!Array.isArray((fileCache as any).stockAlerts)) (fileCache as any).stockAlerts = [];
      if (!Array.isArray((fileCache as any).distributors)) (fileCache as any).distributors = [];
    } else {
      fileCache = defaultDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(fileCache, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('DB archivo no disponible, usando memoria:', err);
    fileCache = fileCache || defaultDb();
  }
  return fileCache as DbShape;
}

function saveFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(fileCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('No se pudo persistir DB local:', err);
  }
}

// ---------- API genérica por documento ----------
type DocKey = 'products' | 'orders' | 'users' | 'stockAlerts' | 'settings' | 'distributors';

export async function readDoc<T>(key: DocKey, fallback: T): Promise<T> {
  if (databaseUrl()) {
    try {
      await ensureSchema();
      const db = await sql();
      const rows = await db`SELECT data FROM kv_store WHERE key = ${key}`;
      if (rows && rows.length > 0) return rows[0].data as T;
      return fallback;
    } catch (err) {
      console.warn(`PG read ${key} falló, usando fallback:`, (err as Error).message);
      return fallback;
    }
  }
  const db = loadFile();
  const val = (db as any)[key];
  return (val === undefined || val === null ? fallback : val) as T;
}

export async function writeDoc(key: DocKey, value: any): Promise<void> {
  if (databaseUrl()) {
    const db = await sql();
    await db`INSERT INTO kv_store (key, data, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}, NOW())
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
    return;
  }
  loadFile();
  (fileCache as any)[key] = value;
  saveFile();
}

export function backendInfo() {
  return { backend: databaseUrl() ? 'postgres' : 'file', persistent: true };
}
