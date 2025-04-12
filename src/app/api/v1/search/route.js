// /api/v1/search.js

import dbAdapter from '../../../../../utils/dbAdapter';
import { generateEmbedding } from '../../lib/documentProcessors';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Find similar documents
    const results = await dbAdapter.query(
      `SELECT id, filename, content, metadata, 
       1 - (embedding <=> $1) AS similarity
       FROM documents
       ORDER BY similarity DESC
       LIMIT 5`,
      [queryEmbedding]
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

    res.status(200).json({
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
    res.status(500).json({ error: error.message });
  }
}