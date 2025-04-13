This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.



## Project Setup

### Project structure

mkdir -p rag-app/postgres/init

### Create initialization script for PostgreSQL

cat > rag-app/postgres/init/01-init.sql

 << 'EOF'
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index for similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create a function to perform semantic search
CREATE OR REPLACE FUNCTION semantic_search(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count INT
) RETURNS TABLE (
  id INT,
  filename TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.filename,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
EOF

### Create docker-compose.yml

cat > rag-app/docker-compose.yml

<< 'EOF'

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
EOF

### Create NextJS application

cd rag-app
npx create-next-app@latest frontend --typescript --tailwind --eslint
cd frontend

### Install dependencies

npm install pg pg-promise openai langchain @langchain/openai mammoth xlsx pdf-parse multer axios dotenv

Hide secrets in .env.local.  For DB_HOST supply the Docker assigned IP Address instead of localhost

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Setting up Postgres & Pgadmin with Docker](https://medium.com/@marvinjungre/get-postgresql-and-pgadmin-4-up-and-running-with-docker-4a8d81048aea) - Configuration Instructions.
- [Setting up Postgres with pvector in Docker](https://medium.com/@adarsh.ajay/setting-up-postgresql-with-pgvector-in-docker-a-step-by-step-guide-d4203f6456bd) - With pvector.


Check out Nextjs [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
