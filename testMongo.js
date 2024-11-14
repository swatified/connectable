const mongoose = require('mongoose');

const uri = 'mongodb+srv://scarletshukurenai:mqZMK3C7xrMo8dWu@cluster0.dc1ds.mongodb.net/chatapp?retryWrites=true&w=majority';

async function testConnection() {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

testConnection();
