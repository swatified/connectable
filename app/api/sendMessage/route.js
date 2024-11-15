import connectMongo from '@/lib/mongodb';
import Message from '@/models/Message';
import pusher from '@/lib/pusher';

export async function POST(request) {
  try {
    await connectMongo();
    const { username, content } = await request.json();

    // Save the message to the database
    const newMessage = await Message.create({ username, content });

    // Trigger Pusher event
    await pusher.trigger('chat-channel', 'message-event', {
      username,
      content,
      timestamp: newMessage.timestamp,
    });

    return new Response(JSON.stringify({ success: true, data: newMessage }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving message:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to save message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
