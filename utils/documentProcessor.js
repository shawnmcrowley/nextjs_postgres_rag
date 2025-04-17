// /util/documentProcessors.js
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Process .doc and .docx files
export async function processDocFile(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Process .xls and .xlsx files
export async function processExcelFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let result = '';
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetText = XLSX.utils.sheet_to_csv(worksheet);
    result += `Sheet: ${sheetName}\n${sheetText}\n\n`;
  });
  
  return result;
}

// Process .pdf files
export async function processPdfFile(buffer) {
  try {
    console.log('Starting PDF processing...');
    const options = {
      disableFontFace: true,
      max: 50 * 1024 * 1024 // 50MB max
    };
    
    const data = await pdfParse(buffer, options);
    console.log('PDF processing complete');
    return data.text;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error(`Failed to extract text from PDF file: ${error.message}`);
  }
}

// Process .ppt and .pptx files
export async function processPptFile(buffer) {
  const textDecoder = new TextDecoder('utf-8');
  const text = textDecoder.decode(buffer);
  return text.replace(/[^\x20-\x7E]/g, ' ').trim();
}

// Simple function to split text into chunks that respect the model's context length
function splitIntoChunks(text, maxLength = 8000) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxLength;
    
    // If we're not at the end, try to find a good breaking point
    if (end < text.length) {
      // Try to break at paragraph
      const paragraphEnd = text.slice(start, end).lastIndexOf('\n\n');
      if (paragraphEnd > 0) {
        end = start + paragraphEnd + 2;
      } else {
        // Try to break at sentence
        const sentenceEnd = text.slice(start, end).lastIndexOf('. ');
        if (sentenceEnd > 0) {
          end = start + sentenceEnd + 2;
        } else {
          // Try to break at word
          const wordEnd = text.slice(start, end).lastIndexOf(' ');
          if (wordEnd > 0) {
            end = start + wordEnd + 1;
          }
        }
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    start = end;
  }
  
  return chunks;
}

// Generate embeddings using OpenAI
export async function generateEmbedding(text) {
  try {
    console.log('Generating embedding...');
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    console.log('Embedding generated');
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

// Main function to process any supported file
export async function processFile(file) {
  try {
    console.log(`Starting to process file: ${file.originalname}`);
    const buffer = file.buffer;
    const fileType = file.originalname.split('.').pop().toLowerCase();
    
    let text;
    console.log(`Extracting text from ${fileType} file...`);
    
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
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    console.log(`Text extraction complete. Length: ${text.length} characters`);

    if (!text || typeof text !== 'string') {
      throw new Error('Failed to extract text from file');
    }

    // Split text into chunks that respect the model's context length
    console.log('Splitting text into chunks...');
    const chunks = splitIntoChunks(text, 8000);
    console.log(`Split text into ${chunks.length} chunks`);

    // Generate embeddings for each chunk
    console.log('Generating embeddings for chunks...');
    const chunkEmbeddings = await Promise.all(
      chunks.map(async (chunk, index) => {
        console.log(`Generating embedding for chunk ${index + 1}/${chunks.length}`);
        return {
          content: chunk,
          embedding: await generateEmbedding(chunk)
        };
      })
    );

    console.log('All embeddings generated successfully');

    return {
      filename: file.originalname,
      content: text,
      metadata: {
        size: file.size,
        type: file.mimetype,
        uploadDate: new Date().toISOString()
      },
      embedding: chunkEmbeddings[0].embedding, // Use first chunk's embedding as document embedding
      chunks: chunkEmbeddings
    };
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(`Failed to process file: ${error.message}`);
  }
}