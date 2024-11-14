import connectMongo from '@/lib/mongodb';

export async function GET(request) {
  try {
    await connectMongo();
    return new Response(JSON.stringify({ success: true, message: 'MongoDB connected successfully' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return new Response(JSON.stringify({ success: false, message: 'MongoDB connection failed' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
