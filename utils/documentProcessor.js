// /util/documentProcessors.js
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse/lib/pdf-parse.js'; // Import directly from the lib folder
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
// Process .xls and .xlsx files
export async function processExcelFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let result = '';
  
  // Iterate through each sheet
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    // Convert the sheet to CSV format
    const sheetText = XLSX.utils.sheet_to_csv(worksheet);
    result += `Sheet: ${sheetName}\n${sheetText}\n\n`;
  });
  
  return result;
}

// Process .pdf files
export async function processPdfFile(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return "Error extracting text from PDF file.";
  }
}
// Process .ppt and .pptx files (simplified - in reality you'd need a better PPT parser)
export async function processPptFile(buffer) {
  // This is a placeholder. For production, use a proper PPT parsing library
  // For now we'll parse it as text and try to extract content
  const textDecoder = new TextDecoder('utf-8');
  const text = textDecoder.decode(buffer);
  return text.replace(/[^\x20-\x7E]/g, ' ').trim();
}

// Generate embeddings using OpenAI
export async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  
  return response.data[0].embedding;
}

// Main function to process any supported file
export async function processFile(file) {
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
      throw new Error(`Unsupported file type: ${fileType}`);
  }
  
  // Generate embedding for the text
  const embedding = await generateEmbedding(text);
  
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
}