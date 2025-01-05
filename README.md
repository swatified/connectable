# Connectable: *the chat application* 💬

> A brief walkthrough to all the features one-by-one

## Real-time Messaging 📧

Real-time messaging functionality is implemented using [Pusher](https://pusher.com/) for websocket connections and MongoDB for message persistence. This combination enables instant message delivery while maintaining a reliable message history.

### How it works:
- Messages are stored in MongoDB for persistence and message history
- Pusher handles the real-time websocket connections between users
- When a message is sent, it's saved to MongoDB and simultaneously broadcast through Pusher to all connected clients

## The Fun Elements ✨

<table style="width: 100%;">
  <tr>
    <td style="width: 33%;"><img src="1.png"></td>
    <td style="width: 33%;"><img src="2.png"></td>
    <td style="width: 33%;"><img src="3.png"></td>
  </tr>
