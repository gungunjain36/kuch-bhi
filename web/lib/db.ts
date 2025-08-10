import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __db_pool__: Pool | undefined
  // eslint-disable-next-line no-var
  var __db_initialized__: boolean | undefined
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
  })
}

export function getDb(): Pool {
  if (!global.__db_pool__) {
    global.__db_pool__ = createPool()
  }
  return global.__db_pool__
}

export async function ensureSchema(): Promise<void> {
  if (global.__db_initialized__) return
  const pool = getDb()
  await pool.query(`
    create table if not exists waitlist_signups (
      id bigserial primary key,
      email text not null unique,
      created_at timestamptz not null default now()
    );
    `)
  global.__db_initialized__ = true
}


