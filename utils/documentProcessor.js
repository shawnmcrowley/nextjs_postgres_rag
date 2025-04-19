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
  // First, clean and normalize the text
  text = text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')       // Normalize multiple newlines
    .replace(/\t/g, '    ')           // Convert tabs to spaces
    .trim();

  // Split into sections based on headings and major breaks
  const sections = text.split(/(?=#{1,6}\s|^[A-Z][^a-z\n]{2,}$|\n{2,}[A-Z][^a-z\n]{2,}\n{2,})/);
  const chunks = [];
  let currentChunk = '';

  for (const section of sections) {
    // Split section into paragraphs
    const paragraphs = section.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    for (const paragraph of paragraphs) {
      // If paragraph is a heading or very short, always keep it with the next paragraph
      if (paragraph.match(/^#{1,6}\s|^[A-Z][^a-z\n]{2,}$/) || paragraph.length < 100) {
        if (currentChunk.length + paragraph.length + 2 > maxLength) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }
        }
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        continue;
      }

      // For longer paragraphs, split by sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
      let sentenceGroup = '';
      
      for (const sentence of sentences) {
        // If adding this sentence would exceed maxLength
        if (currentChunk.length + sentenceGroup.length + sentence.length + 1 > maxLength) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }
          // If a single sentence is too long, split it by clauses
          if (sentence.length > maxLength) {
            const clauses = sentence.split(/(?<=[,;:])\s+/);
            let clauseGroup = '';
            for (const clause of clauses) {
              if (currentChunk.length + clauseGroup.length + clause.length + 1 > maxLength) {
                if (currentChunk) {
                  chunks.push(currentChunk.trim());
                  currentChunk = '';
                }
                clauseGroup = clause;
              } else {
                clauseGroup += (clauseGroup ? ' ' : '') + clause;
              }
            }
            if (clauseGroup) {
              currentChunk = clauseGroup;
            }
          } else {
            currentChunk = sentence;
          }
        } else {
          sentenceGroup += (sentenceGroup ? ' ' : '') + sentence;
          if (sentenceGroup.length > maxLength / 2) {
            currentChunk += (currentChunk ? '\n\n' : '') + sentenceGroup;
            sentenceGroup = '';
          }
        }
      }
      
      // Add any remaining sentences
      if (sentenceGroup) {
        currentChunk += (currentChunk ? '\n\n' : '') + sentenceGroup;
      }
    }
  }

  // Add the last chunk if it exists
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  // Post-process chunks to ensure quality
  return chunks.map(chunk => {
    // Remove any trailing incomplete sentences
    chunk = chunk.replace(/[^.!?]+$/, '');
    // Ensure proper spacing
    chunk = chunk.replace(/\s+/g, ' ').trim();
    return chunk;
  }).filter(chunk => chunk.length > 0);
}

// Generate embeddings using OpenAI
export async function generateEmbedding(text) {
  try {
    console.log('Generating embedding...');
    
    // First, clean and normalize the text
    text = text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Normalize multiple newlines
      .replace(/\t/g, '    ')           // Convert tabs to spaces
      .trim();

    // Split into paragraphs while preserving structure
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Generate embeddings for each paragraph
    const embeddings = await Promise.all(
      paragraphs.map(async (paragraph) => {
        try {
          const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: paragraph.trim(),
            encoding_format: "float"
          });
          return {
            content: paragraph,
            embedding: response.data[0].embedding
          };
        } catch (error) {
          console.error('Error generating embedding for paragraph:', error);
          return null;
        }
      })
    );

    // Filter out any failed embeddings and combine results
    const validEmbeddings = embeddings.filter(embedding => embedding !== null);
    
    if (validEmbeddings.length === 0) {
      throw new Error('No valid embeddings generated');
    }

    // If we have multiple paragraphs, combine their embeddings
    if (validEmbeddings.length > 1) {
      const combinedEmbedding = validEmbeddings[0].embedding.map((_, index) => {
        return validEmbeddings.reduce((sum, emb) => sum + emb.embedding[index], 0) / validEmbeddings.length;
      });
      
      return {
        content: text,
        embedding: combinedEmbedding
      };
    }

    // Return single paragraph result
    return validEmbeddings[0];
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