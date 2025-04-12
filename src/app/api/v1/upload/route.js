// /api/vi/upload/route.js

import multer from 'multer';
import { processFile } from '../../../../../utils/documentProcessor';
import dbAdapter from '../../../../../utils/dbAdapter';

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({ storage: multer.memoryStorage() });

const uploadMiddleware = upload.single('file');

export default async function POST(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return new Promise((resolve, reject) => {
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return reject(res.status(500).json({ error: err.message }));
      }

      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const processedFile = await processFile(file);

        // Save to database
        await dbAdapter.none(
          'INSERT INTO documents(filename, content, metadata, embedding) VALUES($1, $2, $3, $4)',
          [
            processedFile.filename,
            processedFile.content,
            processedFile.metadata,
            processedFile.embedding
          ]
        );

        res.status(200).json({ 
          message: 'File processed and stored successfully',
          filename: processedFile.filename
        });
        return resolve();
      } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: error.message });
        return resolve();
      }
    });
  });
}

