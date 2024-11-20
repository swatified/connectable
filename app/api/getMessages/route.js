import connectMongo from '@/lib/mongodb';
import Message from '@/models/Message';

export async function GET() {
  try {
    await connectMongo();
    const messages = await Message.find().sort({ timestamp: 1 });

    return new Response(JSON.stringify({ success: true, messages }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching messages:', error.message);

    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch messages' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
