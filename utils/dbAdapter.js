// utils/dbAdapter.js
import pgPromise from 'pg-promise';

// Global singleton instance
let dbAdapter = null;

export function getDB() {
  if (dbAdapter !== null) {
    return dbAdapter;
  }
  
  const pgp = pgPromise({});
  
  const connection = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rag_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 30, // max number of connections in the pool
    idleTimeoutMillis: 30000, // how long a connection can be idle before being closed
    connectionTimeoutMillis: 2000 // how long to wait for a connection
  };
  
  dbAdapter = pgp(connection);
  return dbAdapter;
}

// For backwards compatibility
export default getDB();