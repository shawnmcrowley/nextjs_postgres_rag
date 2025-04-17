// utils/dbAdapter.js
import pgPromise from 'pg-promise';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  port: parseInt(process.env.DB_PORT || '5432'),
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

// Generate embeddings using OpenAI
export async function generateEmbedding(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for embedding generation');
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid embedding response from OpenAI');
    }

    const embedding = response.data[0].embedding;
    
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      throw new Error(`Invalid embedding dimensions: expected 1536, got ${embedding.length}`);
    }

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

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

// Create tables if they don't exist
export async function initDb() {
  try {
    console.log('Initializing database...');
    
    // First, create the vector extension if it doesn't exist
    await none(`
      CREATE EXTENSION IF NOT EXISTS vector;
    `);

    // Create the documents table with explicit vector dimensions
    await none(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create the document_chunks table with explicit vector dimensions
    await none(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for document embeddings
    await none(`
      CREATE INDEX IF NOT EXISTS idx_documents_embedding 
      ON documents 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);

    // Create index for chunk embeddings
    await none(`
      CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
      ON document_chunks 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Save document and its chunks
export async function saveDocument(document) {
  try {
    console.log('Starting to save document:', document.filename);
    console.log('Document metadata:', document.metadata);
    
    if (!document.embedding || !Array.isArray(document.embedding)) {
      console.error('Invalid embedding format:', document.embedding);
      throw new Error('Invalid embedding format');
    }

    // Start a transaction
    console.log('Starting database transaction');
    await none('BEGIN');

    try {
      // Insert the main document with embedding
      console.log('Inserting main document');
      const docResult = await one(
        `INSERT INTO documents (filename, content, metadata, embedding) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [document.filename, document.content, document.metadata, document.embedding]
      );

      console.log('Document saved with ID:', docResult.id);

      // Save chunks if they exist
      if (document.chunks && Array.isArray(document.chunks)) {
        console.log(`Saving ${document.chunks.length} chunks for document ${docResult.id}`);
        
        for (let i = 0; i < document.chunks.length; i++) {
          const chunk = document.chunks[i];
          console.log(`Processing chunk ${i + 1}/${document.chunks.length}`);
          
          if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
            console.error(`Invalid embedding format for chunk ${i}`);
            throw new Error(`Invalid embedding format for chunk ${i}`);
          }

          await none(
            `INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
             VALUES ($1, $2, $3, $4)`,
            [docResult.id, i, chunk.content, chunk.embedding]
          );
        }
        
        console.log('All chunks saved successfully');
      }
      
      // Commit the transaction
      console.log('Committing transaction');
      await none('COMMIT');
      
      return docResult.id;
    } catch (error) {
      // Rollback the transaction on error
      console.error('Error during document save, rolling back transaction:', error);
      await none('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in saveDocument:', error);
    throw new Error(`Failed to save document: ${error.message}`);
  }
}

// Search documents using embeddings
export async function searchDocuments(query, limit = 5) {
  try {
    console.log('Generating embedding for query:', query);
    const queryEmbedding = await generateEmbedding(query);
    console.log('Query embedding generated successfully, dimensions:', queryEmbedding.length);
    
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
      throw new Error(`Invalid embedding dimensions: expected 1536, got ${queryEmbedding.length}`);
    }

    // Search both documents and chunks
    console.log('Executing search query');
    const results = await many(`
      WITH document_matches AS (
        SELECT 
          id,
          filename,
          COALESCE(content, '') as content,
          COALESCE(metadata, '{}'::jsonb) as metadata,
          embedding <-> $1::vector(1536) as similarity
        FROM documents
        WHERE embedding IS NOT NULL
        ORDER BY embedding <-> $1::vector(1536)
        LIMIT $2
      ),
      chunk_matches AS (
        SELECT 
          d.id,
          d.filename,
          COALESCE(dc.content, '') as content,
          COALESCE(d.metadata, '{}'::jsonb) as metadata,
          dc.embedding <-> $1::vector(1536) as similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        ORDER BY dc.embedding <-> $1::vector(1536)
        LIMIT $2
      )
      SELECT * FROM (
        SELECT * FROM document_matches
        UNION ALL
        SELECT * FROM chunk_matches
      ) combined_results
      ORDER BY similarity ASC
      LIMIT $2;
    `, [queryEmbedding, limit]);

    console.log('Raw database results:', JSON.stringify(results, null, 2));
    
    // Format the results to ensure content is properly extracted
    const formattedResults = results.map(result => {
      const content = result.content || '';
      console.log('Processing result:', {
        id: result.id,
        filename: result.filename,
        content: content,
        contentType: typeof content,
        similarity: result.similarity
      });

      return {
        id: result.id,
        filename: result.filename,
        content: content,
        similarity: result.similarity,
        metadata: result.metadata || {}
      };
    });

    console.log('Formatted results:', JSON.stringify(formattedResults, null, 2));
    return formattedResults;
  } catch (error) {
    console.error('Error in searchDocuments:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query: query,
      limit: limit
    });
    throw error;
  }
}