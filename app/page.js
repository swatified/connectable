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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('00:00');
  const [mediaRecorder, setMediaRecorder] = useState(null);

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
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
    });

    const channel = pusher.subscribe('chat-channel');
    channel.bind('message-event', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/uploadFile', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        alert('File uploaded successfully');
      } else {
        alert('File upload failed');
      }
    } catch (err) {
      console.error('File upload error:', err.message);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support audio recording.');
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const audioChunks = [];
    let seconds = 0;

    recorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording-${Date.now()}.mp3`);

      try {
        const res = await fetch('/api/uploadAudio', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          alert('Audio uploaded successfully');
        } else {
          alert('Audio upload failed');
        }
      } catch (err) {
        console.error('Audio upload error:', err.message);
      }
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);

    const timer = setInterval(() => {
      seconds++;
      const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
      const secs = String(seconds % 60).padStart(2, '0');
      setRecordingTime(`${mins}:${secs}`);
    }, 1000);

    setTimeout(() => {
      clearInterval(timer);
      recorder.stop();
      setIsRecording(false);
      setRecordingTime('00:00');
    }, 30000); // Stops after 30 seconds
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Chat Room</h1>
        <button className="logout-button" onClick={() => setAuthenticated(false)}>
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
        <label htmlFor="file-upload" className="icon">
          📎
        </label>
        <input
          type="file"
          id="file-upload"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <textarea
          className="message-input"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {isRecording ? (
          <div className="recording-timer">
            <span>🔴 {recordingTime}</span>
            <button className="stop-button" onClick={stopRecording}>
              Stop
            </button>
          </div>
        ) : (
          <button className="icon" onMouseDown={startRecording}>
            🎤
          </button>
        )}
        <button className="send-button" onClick={sendMessage}>
          ➤
        </button>
      </footer>
    </div>
  );
}
