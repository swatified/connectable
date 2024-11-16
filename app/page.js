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

  const login = async () => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('username', username);
        setAuthenticated(true);
        fetchMessages();
        setupPusher();
      } else {
        alert('Invalid username or password');
      }
    } catch (error) {
      console.error('Login failed:', error.message);
    }
  };

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

  const setupPusher = () => {
    Pusher.logToConsole = true;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
    });

    const channel = pusher.subscribe('chat-channel');
    channel.bind('message-event', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    channel.bind('pusher:subscription_error', (error) => {
      console.error('Pusher subscription error:', error);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      const formattedContent = formatMessage(input);

      const res = await fetch('/api/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content: formattedContent }),
      });

      const data = await res.json();
      if (data.success) setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('username');
    setAuthenticated(false);
    setUsername('');
    setMessages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      setInput((prev) => `${prev}\n`);
    }
  };

  const formatMessage = (message) => {
    let formatted = message;
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); // Bold
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>'); // Italics
    formatted = formatted.replace(/~(.+?)~/g, '<del>$1</del>'); // Strikethrough
    formatted = formatted.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>'); // Spoiler
    formatted = formatted.replace(/\n/g, '<br>'); // Newline to <br>
    return formatted;
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
              <span dangerouslySetInnerHTML={{ __html: msg.content }}></span>
              <span className="timestamp">
                ({new Date(msg.timestamp).toLocaleTimeString()})
              </span>
            </div>
          ))}
        </div>
      </main>
      <footer className="chat-footer">
        <textarea
          className="message-input"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="send-button" onClick={sendMessage}>
          Send
        </button>
      </footer>
    </div>
  );
}
