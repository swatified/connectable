import mongoose from 'mongoose';
import connectMongo from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongo();
    console.log('MongoDB connected successfully');

    const { fileId } = params;
    console.log('Searching for file with ID:', fileId);

    const db = mongoose.connection.db;
    const bucketNames = ['general.files', 'audio.files'];
    let fileMetadata = null;
    let chunks = null;
    let usedBucket = null;

    for (const bucketName of bucketNames) {
      console.log(`Checking bucket: ${bucketName}`);
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName });
      fileMetadata = await db.collection(`${bucketName}.files`).findOne({ _id: new ObjectId(fileId) });
      
      if (fileMetadata) {
        console.log(`File found in bucket: ${bucketName}`);
        const chunksCursor = db.collection(`${bucketName}.chunks`).find({ files_id: new ObjectId(fileId) }).sort({ n: 1 });
        chunks = await chunksCursor.toArray();
        usedBucket = bucketName;
        break;
      }
    }
    
    if (!fileMetadata) {
      console.log('File not found in any bucket');
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }
    
    if (!chunks || !chunks.length) {
      console.log('File chunks not found');
      return NextResponse.json({ success: false, error: 'File chunks not found' }, { status: 404 });
    }
    
    console.log(`Assembling file data from ${chunks.length} chunks`);
    const fileData = Buffer.concat(chunks.map(chunk => chunk.data.buffer)).toString('base64');
    
    console.log('File retrieved successfully');
    const responsePayload = {
      success: true,
      data: fileData,
      contentType: fileMetadata.contentType,
      filename: fileMetadata.filename,
      bucket: usedBucket
    };
        
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Detailed error in file retrieval:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error retrieving file',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}