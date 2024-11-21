import mongoose from 'mongoose';
import connectMongo from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const fileCache = new Map();

export async function GET(req, { params }) {
  try {
    const { fileId } = await params;
    
    if (fileCache.has(fileId)) {
      console.log('Serving from cache');
      const cachedData = fileCache.get(fileId);
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    await connectMongo();
    const db = mongoose.connection.db;
    
    const bucketNames = ['general.files', 'audio.files'];
    let fileMetadata = null;
    let chunks = null;
    
    for (const bucketName of bucketNames) {
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName });
      fileMetadata = await db.collection(`${bucketName}.files`).findOne({ _id: new ObjectId(fileId) });
      
      if (fileMetadata) {
        const chunksCursor = db.collection(`${bucketName}.chunks`).find({ files_id: new ObjectId(fileId) }).sort({ n: 1 });
        chunks = await chunksCursor.toArray();
        break;
      }
    }
    
    if (!fileMetadata) {
      return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 });
    }
    
    if (!chunks || !chunks.length) {
      return new Response(JSON.stringify({ error: 'File chunks not found' }), { status: 404 });
    }
    
    const fileData = chunks.map(chunk => Buffer.from(chunk.data.buffer).toString('base64')).join('');
    
    const responsePayload = {
      success: true,
      data: fileData,
      contentType: fileMetadata.contentType,
      filename: fileMetadata.filename,
    };
    
    fileCache.set(fileId, responsePayload);
    
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error retrieving file:', error);
    return new Response(
      JSON.stringify({ error: 'Error retrieving file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}