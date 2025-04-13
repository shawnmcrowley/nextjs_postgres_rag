// src/app/api/v1/upload/route.js
import { processFile } from '../../../../../utils/documentProcessor';
import { none } from '../../../../../utils/dbAdapter';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get the formData from the request
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Process file and generate embeddings
    const processedFile = await processFile({
      originalname: file.name,
      mimetype: file.type,
      size: file.size,
      buffer: await file.arrayBuffer()
    });

    // Save to database using the none helper function
    await none(
      'INSERT INTO documents(filename, content, metadata, embedding) VALUES($1, $2, $3, $4)',
      [
        processedFile.filename,
        processedFile.content,
        processedFile.metadata,
        processedFile.embedding
      ]
    );

    return NextResponse.json({
      message: 'File processed and stored successfully',
      filename: processedFile.filename
    });
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}