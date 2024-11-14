import connectMongo from '@/lib/mongodb';
import Message from '@/models/Message';
import pusher from '@/lib/pusher';

export async function POST(request) {
  try {
    await connectMongo();
    const body = await request.json();
    const { username, content } = body;

    // Save the message to MongoDB
    const newMessage = await Message.create({ username, content });

    // Trigger Pusher for real-time updates
    await pusher.trigger('chat-channel', 'message-event', {
      username,
      content,
      timestamp: newMessage.timestamp,
    });

    return new Response(JSON.stringify({ success: true, data: newMessage }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving message:', error.message);
    return new Response(JSON.stringify({ success: false, error: 'Failed to save message' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
