import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Plain text for simplicity; can be hashed for security
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
