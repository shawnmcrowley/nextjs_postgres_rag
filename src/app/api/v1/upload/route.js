// /api/vi/upload/route.js

import multer from 'multer';
import { processFile } from '../../../../../utils/documentProcessor';
import getDB from '../../../../../utils/dbAdapter';

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({ storage: multer.memoryStorage() });

const uploadMiddleware = upload.single('file');

export async function POST(req, res) {
  if (req.method !== 'POST') {
    return Response.json({ message: 'Method not allowed' }, {status:405});
  }

  return new Promise((resolve, reject) => {
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return reject(Response.json({ error: err.message }, {status:500}));
      }

      try {
        const file = req.file;
        if (!file) {
          return Response.json({ error: 'No file uploaded' }, {status:400});
        }

        const processedFile = await processFile(file);

        // Save to database
        await getDB.none(
          'INSERT INTO documents(filename, content, metadata, embedding) VALUES($1, $2, $3, $4)',
          [
            processedFile.filename,
            processedFile.content,
            processedFile.metadata,
            processedFile.embedding
          ]
        );

        Response.json({ 
          message: 'File processed and stored successfully',
          filename: processedFile.filename
        }, {status:200});
        return resolve();
      } catch (error) {
        console.error('Error processing file:', error);
        Response.json({ error: error.message }, {status:500});
        return resolve();
      }
    });
  });
}

