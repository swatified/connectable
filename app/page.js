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

    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    setInput(`Uploading file: ${file.name} (${fileSize} MB)...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/uploadFile', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      
      if (data.success) {
        setInput('');
        
        const fileMessage = {
          type: 'file',
          filename: data.fileName,
          fileId: data.fileId,
          contentType: data.type,
          size: fileSize
        };

        await fetch('/api/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username, 
            content: JSON.stringify(fileMessage),
            messageType: 'file'
          }),
        });
      } else {
        setInput(`Failed to upload ${file.name}: ${data.error}`);
      }
    } catch (err) {
      console.error('File upload error:', err.message);
      setInput(`Error uploading ${file.name}: ${err.message}`);
    }

    e.target.value = '';
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support audio recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];
      let seconds = 0;

      recorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.mp3`, {
          type: 'audio/mp3'
        });

        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('fileType', 'audio');

        try {
          const res = await fetch('/api/uploadFile', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (data.success) {
            await fetch('/api/sendMessage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                username, 
                content: '🎤 Sent a voice message',
                fileInfo: {
                  id: data.fileId,
                  name: data.fileName,
                  type: 'audio/mp3',
                  fileType: 'audio',
                  duration: seconds
                }
              }),
            });
          } else {
            alert('Failed to upload voice message');
          }
        } catch (err) {
          console.error('Voice message upload error:', err.message);
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
        if (recorder.state === 'recording') {
          clearInterval(timer);
          recorder.stop();
          setIsRecording(false);
          setRecordingTime('00:00');
          stream.getTracks().forEach(track => track.stop());
        }
      }, 30000);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingTime('00:00');
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const renderMessage = (msg) => {
    try {
      if (msg.messageType === 'file') {
        const fileData = JSON.parse(msg.content);
        const fileUrl = `/api/files/${fileData.fileId}`;
        
        if (fileData.contentType.startsWith('image/')) {
          return (
            <div className="media-message">
              <img 
                src={fileUrl} 
                alt={fileData.filename}
                className="chat-image"
                loading="lazy"
              />
              <div className="file-info">
                📎 {fileData.filename} ({fileData.size} MB)
              </div>
            </div>
          );
        } else if (fileData.contentType.startsWith('audio/')) {
          return (
            <div className="media-message">
              <audio controls className="chat-audio">
                <source src={fileUrl} type={fileData.contentType} />
                Your browser does not support the audio element.
              </audio>
              <div className="file-info">
                🎵 {fileData.filename} ({fileData.size} MB)
              </div>
            </div>
          );
        } else if (fileData.contentType.startsWith('video/')) {
          return (
            <div className="media-message">
              <video controls className="chat-video">
                <source src={fileUrl} type={fileData.contentType} />
                Your browser does not support the video element.
              </video>
              <div className="file-info">
                🎥 {fileData.filename} ({fileData.size} MB)
              </div>
            </div>
          );
        } else {
          return (
            <div className="file-message">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="file-link">
                📎 {fileData.filename} ({fileData.size} MB)
              </a>
            </div>
          );
        }
      }

      return (
        <span dangerouslySetInnerHTML={{ __html: msg.content }}></span>
      );
    } catch (error) {
      console.error('Error rendering message:', error);
      return <span>{msg.content}</span>;
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
              {renderMessage(msg)}
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
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
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