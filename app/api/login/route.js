import connectMongo from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request) {
  try {
    await connectMongo();
    const { username, password } = await request.json();
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid username or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return new Response(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
