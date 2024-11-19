import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import SavedMessage from '@/models/SavedMessage';

export async function GET() {
  try {
    await connectMongo();
    const messages = await SavedMessage.find({}).sort({ timestamp: -1 });
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}