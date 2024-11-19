import connectMongo from '@/lib/mongodb';
import mongoose from 'mongoose';
import Message from '@/models/Message';
import { NextResponse } from 'next/server';

export async function DELETE(req) {
    try {
      await connectMongo();
      const db = mongoose.connection.db;
      const { savedMessageIds } = await req.json();
      
      // Delete messages except saved ones
      await Message.deleteMany({
        _id: { $nin: savedMessageIds }
      });
      
      // Delete files not associated with saved messages
      const savedMessages = await SavedMessage.find({});
      const savedFileIds = savedMessages
        .filter(msg => msg.fileId)
        .map(msg => new mongoose.Types.ObjectId(msg.fileId));
  
      await Promise.all([
        db.collection('audio.files.chunks').deleteMany({
          'files_id': { $nin: savedFileIds }
        }),
        db.collection('audio.files.files').deleteMany({
          '_id': { $nin: savedFileIds }
        }),
        db.collection('general.files.chunks').deleteMany({
          'files_id': { $nin: savedFileIds }
        }),
        db.collection('general.files.files').deleteMany({
          '_id': { $nin: savedFileIds }
        })
      ]);
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Database clear error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }