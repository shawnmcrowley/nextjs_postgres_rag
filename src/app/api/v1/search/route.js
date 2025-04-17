// /api/v1/search.js

import { NextResponse } from 'next/server';
import { searchDocuments } from '../../../../../utils/dbAdapter';

export async function POST(request) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log('Searching for query:', query);
    const results = await searchDocuments(query);
    console.log('Raw search results from dbAdapter:', JSON.stringify(results, null, 2));

    // Ensure results is an array and process each result
    const formattedResults = (Array.isArray(results) ? results : []).map(result => {
      console.log('Processing result in route:', {
        id: result.id,
        filename: result.filename,
        content: typeof result.content,
        contentValue: result.content,
        similarity: result.similarity,
        metadata: result.metadata
      });

      return {
        id: result.id,
        filename: result.filename,
        content: String(result.content || ''),
        similarity: result.similarity,
        metadata: result.metadata || {}
      };
    });

    console.log('Formatted results from route:', JSON.stringify(formattedResults, null, 2));
    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}