import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

async function parseMultipartForm(request) {
  const formData = await request.formData();
  const file = formData.get('file') || formData.get('audio');
  const fileType = formData.get('fileType');

  if (!file) {
    throw new Error('No file uploaded');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    filename: file.name,
    buffer: buffer,
    mimetype: file.type,
    size: file.size,
    fileType
  };
}

export async function POST(request) {
  try {
    const fileData = await parseMultipartForm(request);
    mongoose.set('maxPoolSize', 10);
    await connectMongo();
    const db = mongoose.connection.db;

    const bucketName = fileData.fileType === 'audio' ? 'audio.files' : 'general.files';
    const bucket = new GridFSBucket(db, { bucketName });

    const uploadStream = bucket.openUploadStream(fileData.filename, {
      contentType: fileData.mimetype,
      metadata: {
        fileType: fileData.fileType,
        uploadDate: new Date(),
        fileSize: fileData.size
      }
    });

    const uploadPromise = new Promise((resolve, reject) => {
      uploadStream.on('finish', () => {
        resolve(uploadStream.id);
      });

      uploadStream.on('error', (error) => {
        reject(error);
      });
    });

    uploadStream.write(fileData.buffer);
    uploadStream.end();

    const fileId = await uploadPromise;

    return NextResponse.json({
      success: true,
      message: `${fileData.fileType === 'audio' ? 'Audio' : 'File'} uploaded successfully`,
      fileId: fileId.toString(),
      fileName: fileData.filename,
      size: fileData.size,
      type: fileData.mimetype,
      fileType: fileData.fileType
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to upload file. Please try again later.',
    }, { status: 500 });
  }
}