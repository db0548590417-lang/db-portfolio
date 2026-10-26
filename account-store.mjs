import { durableSchema, durableMethods } from './durable-store.mjs';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const schema = `CREATE TABLE IF NOT EXISTS dekel_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_key TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;

export async function createSqliteAccountStore(filename) {
  const { DatabaseSync } = await import('node:sqlite');
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec(schema);
  database.exec(durableSchema);
  return {
    ...durableMethods(database),
    async find(key) { return database.prepare('SELECT a.*, COALESCE(s.session_version,0) AS session_version FROM dekel_accounts a LEFT JOIN dekel_security s ON s.user_id=a.id WHERE a.username_key = ?').get(key) || null; },
    async findById(id) { return database.prepare('SELECT * FROM dekel_accounts WHERE id = ?').get(id) || null; },
    async create(username, usernameKey, passwordHash) {
      const account = { id: randomUUID(), username, username_key: usernameKey, password_hash: passwordHash, created_at: new Date().toISOString() };
      try { database.prepare('INSERT INTO dekel_accounts (id, username, username_key, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(account.id, username, usernameKey, passwordHash, account.created_at); }
      catch (error) { if (/UNIQUE constraint/.test(error.message)) return null; throw error; }
      return account;
    },
    async close() { database.close(); },
  };
}

export async function createPostgresAccountStore(connectionString) {
  const { Pool } = await import('pg');
  const database = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 10000,
    ssl: new URL(connectionString).hostname.includes('.') ? { rejectUnauthorized: true } : undefined });
  database.on('error', () => console.error('Account database connection was interrupted.'));
  try { await database.query(schema); await database.query(durableSchema); } catch (error) { await database.end(); throw error; }
  return {
    async find(key) { return (await database.query('SELECT a.*, COALESCE(s.session_version,0) AS session_version FROM dekel_accounts a LEFT JOIN dekel_security s ON s.user_id=a.id WHERE a.username_key = $1', [key])).rows[0] || null; },
    async findById(id) { return (await database.query('SELECT * FROM dekel_accounts WHERE id = $1', [id])).rows[0] || null; },
    async create(username, usernameKey, passwordHash) {
      const id = randomUUID();
      const result = await database.query('INSERT INTO dekel_accounts (id, username, username_key, password_hash, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username_key) DO NOTHING RETURNING *', [id, username, usernameKey, passwordHash, new Date().toISOString()]);
      return result.rows[0] || null;
    },
    async close() { await database.end(); },
  };
}
