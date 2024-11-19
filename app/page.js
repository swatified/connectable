'use client';

import { useState, useEffect } from 'react';
import Pusher from 'pusher-js';
import './styles/ChatPage.css';

const FileMessage = ({ messageData }) => {
  const [fileContent, setFileContent] = useState(null);

  useEffect(() => {
    const fetchFileData = async () => {
      try {
        const fileData = messageData.fileData || messageData;
        const response = await fetch(`/api/files/${fileData.fileId}`);
        const data = await response.json();

        if (data.success) {
          setFileContent(data);
        }
      } catch (error) {
        console.error('Error fetching file:', error);
      }
    };

    fetchFileData();
  }, [messageData]);

  if (!fileContent) {
    return <div>Loading...</div>;
  }

  const dataUrl = `data:${fileContent.contentType};base64,${fileContent.data}`;

  if (fileContent.contentType.startsWith('image/')) {
    return (
      <div className="media-message">
        <img
          src={dataUrl}
          alt={fileContent.filename}
          className="max-w-full h-auto rounded-lg shadow-md"
          loading="lazy"
        />
        <div className="text-sm text-gray-500 mt-1">
          📎 {fileContent.filename}
        </div>
      </div>
    );
  }

  if (fileContent.contentType.startsWith('audio/')) {
    return (
      <div className="media-message">
        <audio
          controls
          className="w-full rounded-lg shadow-sm"
        >
          <source src={dataUrl} type={fileContent.contentType} />
          Your browser does not support audio playback.
        </audio>
        <div className="text-sm text-gray-500 mt-1">
          🎵 {fileContent.filename}
        </div>
      </div>
    );
  }

  if (fileContent.contentType.startsWith('video/')) {
    return (
      <div className="media-message">
        <video
          controls
          className="w-full rounded-lg shadow-md"
        >
          <source src={dataUrl} type={fileContent.contentType} />
          Your browser does not support video playback.
        </video>
        <div className="text-sm text-gray-500 mt-1">
          🎥 {fileContent.filename}
        </div>
      </div>
    );
  }

  return (
    <div className="file-message p-2 bg-gray-100 rounded-lg">
      <a
        href={dataUrl}
        download={fileContent.filename}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
      >
        📎 {fileContent.filename}
      </a>
    </div>
  );
};

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [messages, setMessages] = useState([]);
  const [savedMessages, setSavedMessages] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('00:00');
  const [mediaRecorder, setMediaRecorder] = useState(null);

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

  const fetchSavedMessages = async () => {
    try {
      const res = await fetch('/api/getSavedMessages');
      const data = await res.json();
      if (data.success) {
        setSavedMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch saved messages:', error);
    }
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      setAuthenticated(true);
      fetchMessages();
      fetchSavedMessages();
      const cleanupPusher = setupPusher();

      return () => {
        if (cleanupPusher) cleanupPusher();
      };
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
      fetchSavedMessages();
      setupPusher();
    } else {
      alert('Invalid username or password');
    }
  } catch (error) {
    console.error('Login failed:', error.message);
  }
};

  const logout = () => {
    localStorage.removeItem('username');
    setAuthenticated(false);
    setUsername('');
    setMessages([]);
    setSavedMessages([]);
  };

  const setupPusher = () => {
    console.log('Setting up Pusher with key:', process.env.NEXT_PUBLIC_PUSHER_KEY);
    
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
    });
  
    const channel = pusher.subscribe('chat-channel');
    
    console.log('Pusher channel subscribed');
    
    channel.bind('message-event', (data) => {
      console.log('Received Pusher message:', data);
      
      // Ensure the data is in the correct format for your messages state
      const formattedMessage = {
        _id: data._id || Date.now().toString(), // Add a unique identifier
        username: data.username,
        content: data.content,
        timestamp: data.timestamp || new Date().toISOString(),
      };
  
      // Use functional update to ensure you're adding to the latest state
      setMessages((prevMessages) => {
        // Check if the message already exists to prevent duplicates
        const messageExists = prevMessages.some(msg => msg.content === formattedMessage.content && msg.username === formattedMessage.username);
        
        if (messageExists) {
          console.log('Message already exists, skipping');
          return prevMessages;
        }
  
        console.log('Adding new message to state');
        return [...prevMessages, formattedMessage];
      });
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
        body: JSON.stringify({ 
          username, 
          content: formattedContent,
          _id: Date.now().toString(), // Add a unique identifier
          timestamp: new Date().toISOString()
        }),
      });
  
      const data = await res.json();
      if (data.success) {
        setInput('');
      }
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
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/~(.+?)~/g, '<del>$1</del>');
    formatted = formatted.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>');
    formatted = formatted.replace(/\n/g, '<br>');
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

  const toggleSaveMessage = async (msg) => {
    try {
      const isAlreadySaved = savedMessages.some(m => m.originalMessageId === msg._id);

      if (isAlreadySaved) {
        const res = await fetch(`/api/saveMessage/${msg._id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          setSavedMessages(prev => prev.filter(m => m.originalMessageId !== msg._id));
        }
      } else {
        const res = await fetch('/api/saveMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalMessageId: msg._id,
            username: msg.username,
            content: msg.content,
            timestamp: msg.timestamp,
            fileInfo: msg.fileInfo,
            fileId: msg.fileId,
            messageType: msg.messageType
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSavedMessages(prev => [...prev, data.savedMessage]);
        }
      }
    } catch (error) {
      console.error('Failed to toggle save message:', error);
    }
  };

  const clearDatabase = async () => {
    if (window.confirm('Clear all unsaved messages?')) {
      try {
        const res = await fetch('/api/clearMessages', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            savedMessageIds: savedMessages.map(m => m.originalMessageId)
          })
        });
        const data = await res.json();
        if (data.success) {
          setMessages([]);
          setShowSaved(false); // Add this line to switch to main view
        }
      } catch (error) {
        console.error('Failed to clear database:', error);
      }
    }
  };

  const renderMessageContent = (msg) => {
    try {
      let messageData = msg.content;
      if (typeof msg.content === 'string') {
        try {
          messageData = JSON.parse(msg.content);
        } catch (e) {
          return <span dangerouslySetInnerHTML={{ __html: msg.content }}></span>;
        }
      }

      if (messageData.type === 'file' || messageData.messageType === 'file') {
        return <FileMessage messageData={messageData} />;
      }

      return <span dangerouslySetInnerHTML={{ __html: msg.content }}></span>;
    } catch (error) {
      console.error('Error rendering message:', error);
      return <span>{msg.content || 'Error displaying message'}</span>;
    }
  };

  const renderMessage = (msg) => {
    const isBookmarked = savedMessages.some(m => m.originalMessageId === msg._id);

    return (
      <div className="message-content">
        <div className="message-header">
          <strong>{msg.username}: </strong>
          <button
            className={`bookmark-button ${isBookmarked ? 'active' : ''}`}
            onClick={() => toggleSaveMessage(msg)}
            title={isBookmarked ? "Remove bookmark" : "Bookmark message"}
          >
            🗁
          </button>
        </div>
        {renderMessageContent(msg)}
        <span className="timestamp">
          ({new Date(msg.timestamp).toLocaleTimeString()})
        </span>
      </div>
    );
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
        <div className="header-buttons">
          <button
            className={`save-toggle ${showSaved ? 'active' : ''}`}
            onClick={() => setShowSaved(!showSaved)}
            title={showSaved ? "Show all messages" : "Show saved messages"}
          >
            💾
          </button>
          <button
            className="clear-button"
            onClick={clearDatabase}
            title="Clear unsaved messages"
          >
            🗑️
          </button>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className="chat-body">
      <div className="chat-messages">
        {(showSaved ? savedMessages : messages.filter(msg =>
        !savedMessages.some(saved => saved.originalMessageId === msg._id)
      )).map((msg, idx) => (
      <div key={idx} className="chat-message">
        {renderMessage(msg)}
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
