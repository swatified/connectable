import connectMongo from '@/lib/mongodb';
import mongoose from 'mongoose';
import Message from '@/models/Message';
import { NextResponse } from 'next/server';
export async function DELETE(req) {
  try {
    await connectMongo();
    const db = mongoose.connection.db;
    
    await Promise.all([
      Message.deleteMany({}),
      db.collection('audio.files.chunks').deleteMany({}),
      db.collection('audio.files.files').deleteMany({}),
      db.collection('general.files.chunks').deleteMany({}),
      db.collection('general.files.files').deleteMany({})
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database clear error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}