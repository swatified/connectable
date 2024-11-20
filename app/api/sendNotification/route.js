import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const USER_PHONE_MAPPING = {
  user1: process.env.USER1_PHONE,
  user2: process.env.USER2_PHONE
};

const NOTIFICATION_MESSAGES = {
  user1: "Checkout the chat, YOU MORON!",
  user2: "subscribe today and get 50% off on the deals."
};

export async function POST(req) {
  try {
    const { fromUser } = await req.json();
    const toUser = fromUser === 'user1' ? 'user2' : 'user1';
    const toPhone = USER_PHONE_MAPPING[toUser];
    
    if (!toPhone) {
      return Response.json({ success: false, error: 'Recipient not found' });
    }

    await client.messages.create({
      body: NOTIFICATION_MESSAGES[fromUser],
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhone
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Twilio error:', error);
    return Response.json({ success: false, error: error.message });
  }
}