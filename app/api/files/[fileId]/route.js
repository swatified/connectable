import mongoose from 'mongoose';
import connectMongo from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req, { params }) {
  const { fileId } = params;

  try {
    await connectMongo();

    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'general.files' });

    // Retrieve file metadata from GridFS
    const fileMetadata = await db.collection('general.files.files').findOne({ _id: new ObjectId(fileId) });

    if (!fileMetadata) {
      return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 });
    }

    // Retrieve file chunks and combine them
    const chunksCursor = db.collection('general.files.chunks').find({ files_id: new ObjectId(fileId) }).sort({ n: 1 });
    const chunks = await chunksCursor.toArray();

    if (!chunks.length) {
      return new Response(JSON.stringify({ error: 'File chunks not found' }), { status: 404 });
    }

    const fileData = chunks.map(chunk => Buffer.from(chunk.data.buffer).toString('base64')).join('');

    // Respond with file data
    return new Response(
      JSON.stringify({
        success: true,
        data: fileData,
        contentType: fileMetadata.contentType,
        filename: fileMetadata.filename,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error retrieving file:', error);
    return new Response(
      JSON.stringify({ error: 'Error retrieving file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
