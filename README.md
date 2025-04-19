# Next.js PostgreSQL RAG System

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

## Database Setup

1. Create a new PostgreSQL database:
```sql
CREATE DATABASE rag_db;
```

2. Connect to the database and run the following SQL commands:
```sql
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
```

## Environment Variables
Create a `.env.local` file in the project root with the following variables:
```
OPENAI_API_KEY=your_openai_api_key_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rag_db
DB_USER=postgres
DB_PASSWORD=postgres
```

## Installation
```bash
npm install
```

## Development
```bash
npm run dev
```

## Features
- Document upload and processing
- Text extraction from various file formats
- Vector embeddings generation
- Semantic search using PostgreSQL vector similarity

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).


### Create docker-compose.yml


    services:
      postgres:
        # Using pgvector's official PostgreSQL image with pgvector pre-installed
        image: pgvector/pgvector:pg15
        container_name: postgres
        environment:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: rag_db
        volumes:
          - postgres_data:/var/lib/postgresql/data
          - ./postgres/init:/docker-entrypoint-initdb.d
        ports:
          - "5432:5432"
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U postgres"]
          interval: 5s
          timeout: 5s
          retries: 5

    pgadmin:
      image: dpage/pgadmin4
      container_name: pgadmin
      environment:
        PGADMIN_DEFAULT_EMAIL: admin@admin.com
        PGADMIN_DEFAULT_PASSWORD: admin
      ports:
        - "5050:80"
      depends_on:
        - postgres

  volumes:
    postgres_data:


- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Setting up Postgres & Pgadmin with Docker](https://medium.com/@marvinjungre/get-postgresql-and-pgadmin-4-up-and-running-with-docker-4a8d81048aea) - Configuration Instructions.
- [Setting up Postgres with pvector in Docker](https://medium.com/@adarsh.ajay/setting-up-postgresql-with-pgvector-in-docker-a-step-by-step-guide-d4203f6456bd) - With pvector.


Check out Nextjs [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
