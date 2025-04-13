// /api/v1/search.js


import { generateEmbedding } from '../../../../../utils/documentProcessor';
import { any } from '../../../../../utils/dbAdapter';
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const data = await request.json();
    const { query } = data;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    const formattedEmbedding = `[${queryEmbedding.join(',')}]`;

    // Find similar documents using our PostgreSQL function with the any helper function
    const results = await any(
      'SELECT * FROM semantic_search($1::vector(1536), 0.7, 5)',
      [formattedEmbedding]
    );
  

    // Use OpenAI to generate a response based on the retrieved documents
    let contextText = results.map(doc => doc.content).join('\n\n');
    contextText = contextText.substring(0, 16000); // Limit context to avoid token limits

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Answer the question based on the provided context. If the answer cannot be found in the context, say so."
        },
        {
          role: "user",
          content: `Context information is below.
          ---------------------
          ${contextText}
          ---------------------
          Given the context information and not prior knowledge, answer the following question: ${query}`
        }
      ],
    });

    return NextResponse.json({
      answer: completion.choices[0].message.content,
      sources: results.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        similarity: doc.similarity,
        metadata: doc.metadata
      }))
    });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}