'use client';

import { useState, useEffect } from 'react';
import Pusher from 'pusher-js';
import './styles/ChatPage.css';

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Check for stored username and auto-login if available
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      setAuthenticated(true);
      fetchMessages();
      setupPusher();
    }
  }, []);

  // Login function
  const login = async () => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('username', username); // Save username to localStorage
        setAuthenticated(true);
        fetchMessages(); // Fetch messages after login
        setupPusher(); // Real-time messaging
      } else {
        alert('Invalid username or password');
      }
    } catch (error) {
      console.error('Login failed:', error.message);
    }
  };

  // Fetch messages from the server
  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/getMessages');
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error.message);
    }
  };

  // Set up Pusher for real-time updates
  const setupPusher = () => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe('chat-channel');
    channel.bind('message-event', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      pusher.unsubscribe('chat-channel');
    };
  };

  // Send a new message
  const sendMessage = async () => {
    if (!input) return;

    try {
      const res = await fetch('/api/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content: input }),
      });

      const data = await res.json();
      if (data.success) setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('username'); // Clear username from localStorage
    setAuthenticated(false);
    setUsername('');
    setMessages([]);
  };

  if (!authenticated) {
    return (
      <div className="auth-container">
        <h1>Login</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Chat Room</h1>
        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </header>
      <main className="chat-body">
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className="chat-message">
              <strong>{msg.username}: </strong>
              {msg.content}{' '}
              <span className="timestamp">
                ({new Date(msg.timestamp).toLocaleTimeString()})
              </span>
            </div>
          ))}
        </div>
      </main>
      <footer className="chat-footer">
        <input
          className="message-input"
          type="text"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="send-button" onClick={sendMessage}>
          Send
        </button>
      </footer>
    </div>
  );
}
