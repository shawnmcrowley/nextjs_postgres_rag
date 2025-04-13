// utils/dbAdapter.js
import pgPromise from 'pg-promise';

// Create options object for initialization
const initOptions = {
  // Add event hooks for connection management
  error(error, e) {
    if (e.cn) {
      // Connection-related error
      console.error('Database connection error:', error);
    }
  }
};

// Global singleton instance
const pgp = pgPromise(initOptions);

const connection = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rag_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Adding connection management options
  max: 30, // max number of connections in the pool
  idleTimeoutMillis: 30000, // how long a connection can be idle before being closed
  connectionTimeoutMillis: 2000 // how long to wait for a connection
};

// Create singleton DB instance
const db = pgp(connection);

/**
 * Execute a database operation with proper connection management
 * @param {Function} operation - Function that takes a DB instance and returns a promise
 * @returns {Promise} - Result of the operation
 */
export async function withConnection(operation) {
  try {
    // Execute the operation with the db instance
    return await operation(db);
  } catch (error) {
    console.error('Database operation error:', error);
    throw error;
  }
}

// For simpler operations
export async function query(text, params) {
  return withConnection(db => db.query(text, params));
}

export async function one(text, params) {
  return withConnection(db => db.one(text, params));
}

export async function none(text, params) {
  return withConnection(db => db.none(text, params));
}

export async function many(text, params) {
  return withConnection(db => db.many(text, params));
}

export async function any(text, params) {
  return withConnection(db => db.any(text, params));
}

// For backwards compatibility
export default db;