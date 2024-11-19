import mongoose from 'mongoose';

const SavedMessageSchema = new mongoose.Schema({
  originalMessageId: String,
  username: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  fileInfo: Object,
  fileId: String,
  messageType: String
});

export default mongoose.models.SavedMessage || mongoose.model('SavedMessage', SavedMessageSchema);