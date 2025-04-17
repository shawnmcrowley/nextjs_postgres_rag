// src/app/api/v1/upload/route.js
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

export async function POST(request) {
  try {
    console.log('Starting file upload process');
    
    // Get the formData from the request
    const formData = await request.formData();
    const files = formData.getAll('files');
    
    if (!files || files.length === 0) {
      console.error('No files found in request');
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    console.log(`Processing ${files.length} files`);
    const results = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} (${file.size} bytes)`);
        
        // Process file and generate embeddings
        const processedFile = await processFile({
          originalname: file.name,
          mimetype: file.type,
          size: file.size,
          buffer: Buffer.from(await file.arrayBuffer())
        });

        console.log(`File processed successfully: ${processedFile.filename}`);
        console.log(`Generated embeddings: ${processedFile.embedding.length} dimensions`);
        if (processedFile.chunks) {
          console.log(`Generated ${processedFile.chunks.length} chunks`);
        }

        console.log(`Saving file to database: ${processedFile.filename}`);
        // Save to database using the new saveDocument function
        const documentId = await saveDocument(processedFile);
        
        if (documentId) {
          results.push({
            filename: processedFile.filename,
            documentId: documentId
          });
          console.log(`File saved successfully: ${processedFile.filename} (ID: ${documentId})`);
        } else {
          throw new Error('Failed to save document to database');
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errors.push({
          filename: file.name,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      console.log('Some files failed to process:', errors);
      return NextResponse.json({
        message: 'Some files were processed successfully, but others failed',
        results: results,
        errors: errors
      }, { status: 207 }); // 207 Multi-Status
    }

    console.log('All files processed successfully');
    return NextResponse.json({
      message: 'All files processed and stored successfully',
      results: results
    });
  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}