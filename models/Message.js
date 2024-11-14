import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }, // Automatically sets the timestamp
});

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
