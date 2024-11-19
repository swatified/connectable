import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import SavedMessage from '@/models/SavedMessage';

export async function POST(req) {
  try {
    await connectMongo();
    const data = await req.json();
    const savedMessage = await SavedMessage.create(data);
    return NextResponse.json({ success: true, savedMessage });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const messageId = url.pathname.split('/').pop();
    await SavedMessage.findOneAndDelete({ originalMessageId: messageId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}