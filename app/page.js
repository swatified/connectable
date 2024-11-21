'use client';

import { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import './styles/ChatPage.css';
import EmojiGifPicker from './components/EmojiGifPicker'

const FileMessage = ({ messageData }) => {
  const [fileContent, setFileContent] = useState(null);

  const getFileIcon = (contentType) => {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎬';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('word') || contentType.includes('document')) return '📝';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊';
    return '📎';
  };
  
  useEffect(() => {
    const fetchFileData = async () => {
      try {
        const fileData = messageData.fileId ? messageData : 
                         (typeof messageData.content === 'string' ? JSON.parse(messageData.content) : messageData);
        
        const response = await fetch(`/api/files/${fileData.fileId || fileData.id}`);
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
          {getFileIcon(fileContent.contentType)} {fileContent.filename}
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
          {getFileIcon(fileContent.contentType)} {fileContent.filename}
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
          {getFileIcon(fileContent.contentType)} {fileContent.filename}
        </div>
      </div>
    );
  }

  return (
    <div className="file-message p-2 bg-gray-100 rounded-lg">
      <a
        href={dataUrl}
        download={fileContent.filename}
        className="flex items-center gap-2 text-blue-500 hover:text-blue-800"
      >
        {getFileIcon(fileContent.contentType)} {fileContent.filename}
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [windowFocused, setWindowFocused] = useState(true);
  const notificationSound = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [notificationCooldown, setNotificationCooldown] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

// Add this handler function with your other functions
const handleEmojiSelect = (emojiOrFile) => {
  if (typeof emojiOrFile === 'string') {
    // For emojis
    setInput(prev => prev + emojiOrFile);
  } else {
    // For GIFs
    handleFileUpload({ target: { files: [emojiOrFile] } });
  }
};
  const messagesEndRef = useRef(null);

  const handleNotification = async () => {
    if (notificationCooldown) {
      const remainingTime = Math.ceil((300000 - (Date.now() - lastNotificationTime)) / 60000);
      alert(`Please wait ${remainingTime} minutes before sending another notification`);
      return;
    }

    try {
      const res = await fetch('/api/sendNotification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUser: username,
        })
      });

      const data = await res.json();
      if (data.success) {
        setNotificationCooldown(true);
        setLastNotificationTime(Date.now());
        alert(`Notification sent to ${username === 'user1' ? 'user2' : 'user1'}!`);
        
        setTimeout(() => {
          setNotificationCooldown(false);
        }, 300000);
      } else {
        alert('Failed to send notification: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error sending notification');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, savedMessages, showSaved]);

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

  useEffect(() => {
    notificationSound.current = new Audio('/notification.mp3');
  }, []);
  
  useEffect(() => {
    const handleFocus = () => {
      setWindowFocused(true);
      setUnreadCount(0);
      document.title = 'Chat Room';
    };
  
    const handleBlur = () => {
      setWindowFocused(false);
    };
  
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
  
    setWindowFocused(document.hasFocus());
  
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWindowFocused(false);
      } else {
        setWindowFocused(true);
        setUnreadCount(0);
        document.title = 'Chat Room';
      }
    };
  
    if (typeof document !== 'undefined') {
      setWindowFocused(!document.hidden);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
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

  const handlePaste = async (e) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      const file = e.clipboardData.files[0];
      await handleFileUploadFromClipboard(file);
      return;
    }
  
    const clipboardItems = e.clipboardData.items;
    const items = [...clipboardItems].filter(item => {
      return item.type.indexOf('image/') !== -1 ||
             item.type.indexOf('video/') !== -1 ||
             item.type === 'image/gif';
    });
  
    if (items.length === 0) return;
  
    e.preventDefault();
    const item = items[0];
    const blob = item.getAsFile();
    
    if (!blob) return;
  
    await handleFileUploadFromClipboard(blob);
  };
  
  const handleFileUploadFromClipboard = async (file) => {
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    setInput(`Uploading: ${file.name || 'clipboard content'} (${fileSize} MB)`);
  
    const formData = new FormData();
    
    if (!file.name) {
      const extension = file.type.split('/')[1] || 'png';
      const fileName = `clipboard-${Date.now()}.${extension}`;
      file = new File([file], fileName, { type: file.type });
    }
    
    formData.append('file', file);
  
    try {
      setUploadProgress(0);
      const res = await fetch('/api/uploadFile', {
        method: 'POST',
        body: formData
      });
  
      const data = await res.json();
  
      if (data.success) {
        setInput('');
        setUploadProgress(null);
  
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
        setInput(`Failed to upload ${file.name || 'clipboard content'}: ${data.error}`);
        setUploadProgress(null);
      }
    } catch (err) {
      console.error('Upload error:', err.message);
      setInput(`Error uploading ${file.name || 'clipboard content'}: ${err.message}`);
      setUploadProgress(null);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    setInput(`Uploading: ${file.name} (${fileSize} MB)`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(0);
      const res = await fetch('/api/uploadFile', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setInput('');
        setUploadProgress(null);
        
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
        setUploadProgress(null);
      }
    } catch (err) {
      console.error('Upload error:', err.message);
      setInput(`Error uploading ${file.name}: ${err.message}`);
      setUploadProgress(null);
    }
  };

  const setupPusher = () => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
    });

    const channel = pusher.subscribe('chat-channel');
    
    channel.bind('message-event', (data) => {
      const formattedMessage = {
        _id: data._id || Date.now().toString(),
        username: data.username,
        content: data.content,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      if (data.username !== username && document.hidden) {
        try {
          notificationSound.current.volume = 0.5;
          notificationSound.current.play().catch(err => 
            console.error('Error playing sound:', err)
          );
        } catch (error) {
          console.error('Sound playback error:', error);
        }

        setUnreadCount(prev => {
          const newCount = prev + 1;
          document.title = `Chat Room (${newCount})`;
          return newCount;
        });
      }

      setMessages((prevMessages) => {
        const messageExists = prevMessages.some(msg => 
          msg.content === formattedMessage.content && 
          msg.username === formattedMessage.username
        );
        
        if (messageExists) {
          return prevMessages;
        }

        return [...prevMessages, formattedMessage];
      });

      scrollToBottom();
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
          _id: Date.now().toString(),
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
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
          type: 'audio/webm'
        });
  
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('fileType', 'audio');
        
        try {
          const res = await fetch('/api/uploadFile', {
            method: 'POST',
            body: formData
          });
  
          const data = await res.json();
  
          if (data.success) {
            await fetch('/api/sendMessage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username,
                content: JSON.stringify({
                  type: 'file',
                  filename: data.fileName,
                  fileId: data.fileId,
                  contentType: data.type,
                  size: data.size,
                  duration: seconds
                }),
                messageType: 'file'
              }),
            });
  
            setIsRecording(false);
            setRecordingTime('00:00');
          } else {
            alert('Failed to upload voice message');
            setIsRecording(false);
            setRecordingTime('00:00');
          }
        } catch (err) {
          console.error('Voice message upload error:', err.message);
          alert('Error uploading voice message');
          setIsRecording(false);
          setRecordingTime('00:00');
        } finally {
          stream.getTracks().forEach(track => track.stop());
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
        }
      }, 30000);
  
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording');
      setIsRecording(false);
      setRecordingTime('00:00');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
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
    if (window.confirm('Are you sure? This will delete all messages permanently.')) {
      try {
        const res = await fetch('/api/clearMessages', {
          method: 'DELETE'
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
          setMessages([]);
          console.log('Database cleared successfully');
        } else {
          throw new Error(data.error || 'Failed to clear database');
        }
      } catch (error) {
        console.error('Failed to clear database:', error);
        alert('Failed to clear messages. Please try again.');
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
          className="text-gray-600"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="text-gray-600"
        />
        <button onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div 
    className="chat-container"
    onDragEnter={handleDragEnter}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
  >
    {isDragging && (
      <div className="drag-overlay">
        <div className="drag-overlay-content">
          <i>📁</i>
          <p>Drop media here to upload</p>
        </div>
      </div>
    )}
      <header className="chat-header">
      <h1>Chat Room</h1>
        <div className="header-buttons">
        <button
    className={`notification-bell ${notificationCooldown ? 'cooldown' : ''}`}
    onClick={handleNotification}
    disabled={notificationCooldown}
    title={notificationCooldown ? "Notification on cooldown" : "Send notification"}
  >
    <span style={{ color: notificationCooldown ? '#808080' : '#FFD700' }}>
      {notificationCooldown ? '🔔' : '🔔'}
    </span>
  </button>
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
          <div ref={messagesEndRef} /> {/* This is where we add the scroll ref */}
        </div>
      </main>

      <footer className="chat-footer">
      {uploadProgress !== null && (
        <div className="upload-progress">
          <div 
            className="upload-progress-bar" 
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
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
        <button 
    className="icon" 
    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
  >
    😊
  </button>
  {showEmojiPicker && (
    <EmojiGifPicker 
      onSelect={handleEmojiSelect}
      onClose={() => setShowEmojiPicker(false)}
    />
  )}
        <textarea
        className="message-input"
        placeholder="Type a message"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
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
