#!/bin/bash

# Create the project directory
mkdir -p nextjs_postgres_rag
cd nextjs_postgres_rag

# Initialize a new Next.js project with TypeScript
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install required dependencies
npm install pg-promise openai mammoth xlsx pdf-parse

# Create necessary directories
mkdir -p src/app/api/v1/upload
mkdir -p src/app/api/v1/search
mkdir -p utils

# Create environment variables file
cat > .env.local << EOL
OPENAI_API_KEY=your_openai_api_key_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rag_db
DB_USER=postgres
DB_PASSWORD=postgres
EOL

# Create README.md with setup instructions
cat > README.md << EOL
# Next.js PostgreSQL RAG System

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

## Database Setup

1. Create a new PostgreSQL database:
\`\`\`sql
CREATE DATABASE rag_db;
\`\`\`

2. Connect to the database and run the following SQL commands:
\`\`\`sql
-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the document_chunks table
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for embeddings
CREATE INDEX idx_documents_embedding 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_document_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
\`\`\`

## Environment Variables
Create a \`.env.local\` file in the project root with the following variables:
\`\`\`
OPENAI_API_KEY=your_openai_api_key_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rag_db
DB_USER=postgres
DB_PASSWORD=postgres
\`\`\`

## Installation
\`\`\`bash
npm install
\`\`\`

## Development
\`\`\`bash
npm run dev
\`\`\`

## Features
- Document upload and processing
- Text extraction from various file formats
- Vector embeddings generation
- Semantic search using PostgreSQL vector similarity
EOL

# Create the main page component
cat > src/app/page.tsx << EOL
"use client";
import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isFolderMode, setIsFolderMode] = useState(false);
  const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB in bytes

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFileError(null);
    
    // Filter out directories and only keep actual files
    const validFiles = selectedFiles.filter(file => {
      if (!(file instanceof File)) return false;
      if (file.size === 0) return false;
      if (file.size > MAX_FILE_SIZE) {
        setFileError(\`File "\${file.name}" is too large. Maximum size is 30MB.\`);
        return false;
      }
      return true;
    });
    
    setFiles(validFiles);
  };

  const toggleSelectionMode = () => {
    setIsFolderMode(!isFolderMode);
    setFiles([]);
    setFileError(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!files.length) return;
    if (fileError) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    setUploading(true);

    try {
      const response = await axios.post("/api/v1/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        maxContentLength: MAX_FILE_SIZE,
        maxBodyLength: MAX_FILE_SIZE,
      });
      setUploadResult(response.data);
    } catch (error) {
      console.error("Error uploading files:", error);
      setUploadResult({
        error: error.response?.data?.error || "Error uploading files",
      });
    } finally {
      setUploading(false);
      setFiles([]);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <main className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold">
          Document Retrieval-Augmented Generation
        </h1>

        <div className="bg-gray-100 p-6 rounded-md">
          <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <div>
              <label className="block mb-2">
                Select files or folders (.doc, .xls, .pdf, .ppt) - Max 30MB per file
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={toggleSelectionMode}
                  className={\`px-3 py-1 rounded text-sm \${
                    isFolderMode
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }\`}
                >
                  Folder Mode
                </button>
                <button
                  type="button"
                  onClick={toggleSelectionMode}
                  className={\`px-3 py-1 rounded text-sm \${
                    !isFolderMode
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }\`}
                >
                  File Mode
                </button>
              </div>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx"
                  multiple
                  {...(isFolderMode ? { webkitdirectory: "true", directory: "true" } : {})}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="border p-2 w-full bg-white rounded flex items-center justify-between">
                  <span className="text-gray-600">
                    {files.length > 0 ? \`Selected \${files.length} file\${files.length !== 1 ? 's' : ''}\` : \`Choose \${isFolderMode ? 'Folder' : 'Files'}\`}
                  </span>
                  <span className="text-blue-500 text-sm">
                    {files.length > 0 ? 'Change Selection' : 'Browse'}
                  </span>
                </div>
              </div>
              {fileError && (
                <p className="mt-2 text-sm text-red-500">{fileError}</p>
              )}
              {files.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Selected files:</p>
                  <ul className="list-disc pl-4 mt-1 max-h-32 overflow-y-auto">
                    {files.map((file, index) => (
                      <li key={index} className="truncate">
                        {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!files.length || uploading || fileError}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              {uploading ? "Uploading..." : \`Upload \${files.length} Document\${files.length !== 1 ? 's' : ''}\`}
            </button>
          </form>

          {uploadResult && (
            <div className="mt-4">
              {uploadResult.error ? (
                <p className="text-red-500">{uploadResult.error}</p>
              ) : (
                <div className="text-green-500">
                  <p>Successfully uploaded:</p>
                  <ul className="list-disc pl-4">
                    {uploadResult.results && Array.isArray(uploadResult.results) && uploadResult.results.length > 0 ? (
                      uploadResult.results.map((result, index) => (
                        <li key={index}>
                          {result.filename} (ID: {result.documentId})
                        </li>
                      ))
                    ) : (
                      <li className="text-yellow-500">No files were uploaded successfully</li>
                    )}
                  </ul>
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-2 text-red-500">
                      <p>Errors occurred with some files:</p>
                      <ul className="list-disc pl-4">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index}>
                            {error.filename}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
EOL

# Create the upload API route
cat > src/app/api/v1/upload/route.ts << EOL
import { processFile } from '../../../../../utils/documentProcessor';
import { saveDocument } from '../../../../../utils/dbAdapter';
import { NextResponse } from 'next/server';

// Configure the maximum request body size
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '30mb'
    }
  }
};

export async function POST(request: Request) {
  try {
    // Get the formData from the request
    const formData = await request.formData();
    const files = formData.getAll('files');
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        console.log(\`Processing file: \${file.name}\`);
        // Process file and generate embeddings
        const processedFile = await processFile({
          originalname: file.name,
          mimetype: file.type,
          size: file.size,
          buffer: await file.arrayBuffer()
        });

        console.log(\`Saving file to database: \${processedFile.filename}\`);
        // Save to database using the new saveDocument function
        const documentId = await saveDocument(processedFile);
        
        if (documentId) {
          results.push({
            filename: processedFile.filename,
            documentId: documentId
          });
          console.log(\`File saved successfully: \${processedFile.filename}\`);
        } else {
          throw new Error('Failed to save document to database');
        }
      } catch (error) {
        console.error(\`Error processing file \${file.name}:\`, error);
        errors.push({
          filename: file.name,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        message: 'Some files were processed successfully, but others failed',
        results: results,
        errors: errors
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({
      message: 'All files processed and stored successfully',
      results: results
    });
  } catch (error) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
EOL

# Create the search API route
cat > src/app/api/v1/search/route.ts << EOL
import { searchDocuments } from '../../../../../utils/dbAdapter';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'No query provided' },
        { status: 400 }
      );
    }

    const results = await searchDocuments(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
EOL

# Create the document processor utility
cat > utils/documentProcessor.ts << EOL
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Process .doc and .docx files
export async function processDocFile(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Process .xls and .xlsx files
export async function processExcelFile(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let result = '';
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetText = XLSX.utils.sheet_to_csv(worksheet);
    result += \`Sheet: \${sheetName}\n\${sheetText}\n\n\`;
  });
  
  return result;
}

// Process .pdf files
export async function processPdfFile(buffer: Buffer) {
  try {
    const options = {
      disableFontFace: true,
      max: 0,
      pagerender: async (pageData: any) => {
        try {
          return await pageData.getTextContent();
        } catch (error) {
          console.warn(\`Warning processing PDF page: \${error.message}\`);
          return { items: [] };
        }
      }
    };

    const data = await pdfParse(buffer, options);
    
    if (data.text.includes('TT: undefined function')) {
      data.text = data.text.replace(/TT: undefined function: \d+\n?/g, '');
    }
    
    return data.text || "No text content found in PDF.";
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return "Error extracting text from PDF file. The file may be corrupted or password protected.";
  }
}

// Process .ppt and .pptx files
export async function processPptFile(buffer: Buffer) {
  const textDecoder = new TextDecoder('utf-8');
  const text = textDecoder.decode(buffer);
  return text.replace(/[^\x20-\x7E]/g, ' ').trim();
}

// Generate embeddings using OpenAI
export async function generateEmbedding(text: string) {
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

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(\`Failed to generate embedding: \${error.message}\`);
  }
}

// Main function to process any supported file
export async function processFile(file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}) {
  try {
    const buffer = file.buffer;
    const fileType = file.originalname.split('.').pop().toLowerCase();
    
    let text;
    
    switch (fileType) {
      case 'doc':
      case 'docx':
        text = await processDocFile(buffer);
        break;
      case 'xls':
      case 'xlsx':
        text = await processExcelFile(buffer);
        break;
      case 'pdf':
        text = await processPdfFile(buffer);
        break;
      case 'ppt':
      case 'pptx':
        text = await processPptFile(buffer);
        break;
      default:
        throw new Error(\`Unsupported file type: \${fileType}\`);
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Failed to extract text from file');
    }

    // Generate embedding for the text
    const embedding = await generateEmbedding(text);
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Failed to generate valid embedding');
    }

    return {
      filename: file.originalname,
      content: text,
      metadata: {
        size: file.size,
        type: file.mimetype,
        uploadDate: new Date().toISOString()
      },
      embedding
    };
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(\`Failed to process file: \${error.message}\`);
  }
}
EOL

# Create the database adapter utility
cat > utils/dbAdapter.ts << EOL
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

// Save document and its chunks
export async function saveDocument(document) {
  try {
    console.log('Saving document:', document.filename);
    
    if (!document.embedding || !Array.isArray(document.embedding)) {
      throw new Error('Invalid embedding format');
    }

    // Start a transaction
    await none('BEGIN');

    // Insert the main document with embedding
    const docResult = await one(
      \`INSERT INTO documents (filename, content, metadata, embedding) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id\`,
      [document.filename, document.content, document.metadata, document.embedding]
    );

    console.log('Document saved with ID:', docResult.id);
    
    // Commit the transaction
    await none('COMMIT');
    
    return docResult.id;
  } catch (error) {
    // Rollback the transaction on error
    await none('ROLLBACK');
    console.error('Error saving document:', error);
    throw error;
  }
}

// Search documents using embeddings
export async function searchDocuments(query, limit = 5) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    // Search both documents and chunks
    const results = await many(\`
      WITH document_matches AS (
        SELECT 
          id,
          filename,
          content,
          metadata,
          1 - (embedding <=> $1) as similarity
        FROM documents
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1
        LIMIT $2
      ),
      chunk_matches AS (
        SELECT 
          d.id,
          d.filename,
          dc.content,
          d.metadata,
          1 - (dc.embedding <=> $1) as similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        ORDER BY dc.embedding <=> $1
        LIMIT $2
      )
      SELECT * FROM (
        SELECT * FROM document_matches
        UNION ALL
        SELECT * FROM chunk_matches
      ) combined_results
      ORDER BY similarity DESC
      LIMIT $2;
    \`, [queryEmbedding, limit]);

    return results;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}
EOL

# Create the next.config.mjs file
cat > next.config.mjs << EOL
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
          bodySizeLimit: '30mb',
        },
      },
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
        };
        return config;
    }
};

export default nextConfig;
EOL

echo "Project setup complete! Please follow the instructions in README.md to set up your database and environment variables." 