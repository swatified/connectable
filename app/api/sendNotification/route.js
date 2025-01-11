import twilio from 'twilio';

let client;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Only initialize Twilio if credentials are available
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

const USER_PHONE_MAPPING = {
  user1: process.env.USER1_PHONE,
  user2: process.env.USER2_PHONE
};

const NOTIFICATION_MESSAGES = {
  user1: "Check out the chat!",
  user2: "You have new messages waiting."
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { fromUser } = body;

    if (!fromUser) {
      return Response.json({ 
        success: false, 
        error: 'fromUser is required' 
      });
    }

    // If Twilio is not configured, return success without sending SMS
    if (!client) {
      console.log('Twilio credentials not configured, skipping SMS notification');
      return Response.json({ 
        success: true,
        message: 'Notification handled (SMS disabled - Twilio not configured)'
      });
    }

    const toUser = fromUser === 'user1' ? 'user2' : 'user1';
    const toPhone = USER_PHONE_MAPPING[toUser];

    if (!toPhone) {
      return Response.json({ 
        success: false, 
        error: 'Recipient phone number not found' 
      });
    }

    await client.messages.create({
      body: NOTIFICATION_MESSAGES[fromUser],
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhone
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Internal server error'
    });
  }
}