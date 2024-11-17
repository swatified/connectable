import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  try {
    const fileId = params.fileId;
    
    await connectMongo();
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    const file = await db.collection('files.files').findOne({ _id: new ObjectId(fileId) });
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'File not found' 
      }, { status: 404 });
    }

    const chunks = [];
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to serve file'
    }, { status: 500 });
  }
}