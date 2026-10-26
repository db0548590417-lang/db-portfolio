export const durableSchema = `CREATE TABLE IF NOT EXISTS dekel_documents (
  user_id TEXT NOT NULL, document_key TEXT NOT NULL, content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(user_id, document_key)
);
CREATE TABLE IF NOT EXISTS dekel_security (
  user_id TEXT PRIMARY KEY, recovery_hash TEXT, recovery_expires TEXT,
  session_version INTEGER NOT NULL DEFAULT 0
);`;

export function durableMethods(database, postgres = false) {
  const query = async (sql, values = []) => postgres ? (await database.query(sql, values)).rows : database.prepare(sql.replace(/\$\d+/g, '?')).all(...values);
  const methods = {
    async readDocument(userId, key) { return (await query('SELECT content, version FROM dekel_documents WHERE user_id = $1 AND document_key = $2', [userId, key]))[0] || null; },
    async writeDocument(userId, key, content, expected = null, quotaBytes = 250_000_000) {
      const connection = postgres ? await database.connect() : database;
      const run = async (sql,values=[]) => postgres ? (await connection.query(sql,values)).rows : connection.prepare(sql.replace(/\$\d+/g,'?')).all(...values);
      try {
        if(postgres){await connection.query('BEGIN');await connection.query('SELECT pg_advisory_xact_lock(hashtext($1))',[userId]);}
        else connection.exec('BEGIN IMMEDIATE');
        const sizeExpr = postgres ? 'octet_length(content)' : 'length(CAST(content AS BLOB))';
        const used = (await run(`SELECT COALESCE(SUM(${sizeExpr}),0) AS bytes FROM dekel_documents WHERE user_id=$1 AND document_key<>$2`,[userId,key]))[0];
        if(Number(used.bytes)+Buffer.byteLength(content)>quotaBytes)throw Error('מכסת אחסון הענן לחשבון מלאה. הנתונים המקומיים נשמרו.');
        const rows = await run(`INSERT INTO dekel_documents(user_id, document_key, content, version) VALUES ($1,$2,$3,1)
          ON CONFLICT(user_id, document_key) DO UPDATE SET content = excluded.content, version = dekel_documents.version + 1
          WHERE $4 < 0 OR dekel_documents.version = $5 RETURNING version`, [userId,key,content,expected ?? -1,expected ?? -1]);
        if(postgres)await connection.query('COMMIT');else connection.exec('COMMIT');
        return rows[0]?.version || null;
      }catch(error){if(postgres)await connection.query('ROLLBACK');else connection.exec('ROLLBACK');throw error;}
      finally{if(postgres)connection.release();}
    },
    async removeDocument(userId,key) { await query('DELETE FROM dekel_documents WHERE user_id = $1 AND document_key = $2 RETURNING document_key',[userId,key]); },
    async security(userId) { return (await query('SELECT * FROM dekel_security WHERE user_id = $1',[userId]))[0] || {session_version:0}; },
    async setRecovery(userId, hash, expires) {
      await query(`INSERT INTO dekel_security(user_id,recovery_hash,recovery_expires) VALUES ($1,$2,$3)
        ON CONFLICT(user_id) DO UPDATE SET recovery_hash=excluded.recovery_hash,recovery_expires=excluded.recovery_expires RETURNING user_id`,[userId,hash,expires]);
    },
    async recoverPassword(userId, hash, passwordHash) {
      // Claim the one-use recovery code and replace the password in one transaction.
      const connection = postgres ? await database.connect() : database;
      const run = async (sql,values=[]) => postgres ? (await connection.query(sql,values)).rows : connection.prepare(sql.replace(/\$\d+/g,'?')).all(...values);
      try {
        if (postgres) await connection.query('BEGIN'); else connection.exec('BEGIN IMMEDIATE');
        const claimed = await run(`UPDATE dekel_security SET recovery_hash=NULL,recovery_expires=NULL,session_version=session_version+1
          WHERE user_id=$1 AND recovery_hash=$2 AND recovery_expires>$3 RETURNING user_id`,[userId,hash,new Date().toISOString()]);
        if (claimed.length) await run('UPDATE dekel_accounts SET password_hash=$1 WHERE id=$2 RETURNING id',[passwordHash,userId]);
        if (postgres) await connection.query('COMMIT'); else connection.exec('COMMIT');
        return claimed.length > 0;
      } catch(error) { if(postgres) await connection.query('ROLLBACK'); else connection.exec('ROLLBACK'); throw error; }
      finally {if(postgres) connection.release();}
    },
  };
  if(postgres)return methods;
  let pending=Promise.resolve();
  return Object.fromEntries(Object.entries(methods).map(([name,method])=>[name,(...args)=>{const result=pending.then(()=>method(...args));pending=result.catch(()=>{});return result;}]));
}
