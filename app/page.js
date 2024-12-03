'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChatContext } from './context/ChatContext';
import EmojiGifPicker from './components/EmojiGifPicker';
import FileMessage from './components/FileMessage';
import './styles/ChatPage.css';

export default function Home() {
  const {
    username,
    setUsername,
    authenticated,
    messages,
    savedMessages,
    showSaved,
    unreadCount,
    windowFocused,
    notificationCooldown,
    setShowSaved,
    setWindowFocused,
    setUnreadCount,
    login,
    logout,
    sendMessage,
    toggleSaveMessage,
    clearDatabase,
    handleNotification
  } = useChatContext();

  const [password, setPassword] = useState('');
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('00:00');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0); // Added state for total elapsed time
  const messagesEndRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

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
  }, [setWindowFocused, setUnreadCount]);

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
  }, [setWindowFocused, setUnreadCount]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, savedMessages, showSaved]);

  const handleLogin = async () => {
    try {
      await login(password);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEmojiSelect = (emojiOrFile) => {
    if (typeof emojiOrFile === 'string') {
      setInput(prev => prev + emojiOrFile);
    } else {
      handleFileUpload({ target: { files: [emojiOrFile] } });
    }
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
  
        await sendMessage(JSON.stringify(fileMessage), 'file');
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
    await handleFileUpload({ target: { files: [file] } });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    setInput(`Uploading file: ${file.name} (${fileSize} MB)...`);

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

        await sendMessage(JSON.stringify(fileMessage), 'file');
      } else {
        setInput(`Failed to upload ${file.name}: ${data.error}`);
        setUploadProgress(null);
      }
    } catch (err) {
      console.error('File upload error:', err.message);
      setInput(`Error uploading ${file.name}: ${err.message}`);
      setUploadProgress(null);
    }

    e.target.value = '';
  };

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support audio recording.');
      return;
    }

    try {
      let stream;
      if (!mediaRecorder) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        setAudioChunks([]);

        recorder.ondataavailable = (e) => {
          setAudioChunks(chunks => [...chunks, e.data]);
        };
      }

      if (isPaused) {
        mediaRecorder.resume();
      } else {
        mediaRecorder.start(1000);
        recordingStartTimeRef.current = Date.now();
      }

      setIsRecording(true);
      setIsPaused(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = setInterval(() => {
        const currentElapsedTime = Date.now() - recordingStartTimeRef.current;
        const totalTime = totalElapsedTime + currentElapsedTime;
        const mins = String(Math.floor(totalTime / 60000)).padStart(2, '0');
        const secs = String(Math.floor((totalTime % 60000) / 1000)).padStart(2, '0');
        setRecordingTime(`${mins}:${secs}`);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording');
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime('00:00');
    }
  }, [mediaRecorder, isPaused, totalElapsedTime]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      clearInterval(timerIntervalRef.current);
      setIsPaused(true);
      setTotalElapsedTime(prevTotal => prevTotal + (Date.now() - recordingStartTimeRef.current));
    } else if (mediaRecorder && mediaRecorder.state === 'paused') {
      startRecording();
    }
  }, [mediaRecorder, startRecording, setTotalElapsedTime]);

  const sendVoiceMessage = useCallback(async () => {
    setTotalElapsedTime(0);
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

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
        await sendMessage(JSON.stringify({
          type: 'file',
          filename: data.fileName,
          fileId: data.fileId,
          contentType: data.type,
          size: data.size,
          duration: Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
        }), 'file');

        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime('00:00');
        setMediaRecorder(null);
        setAudioChunks([]);
      } else {
        alert('Failed to upload voice message');
      }
    } catch (err) {
      console.error('Voice message upload error:', err.message);
      alert('Error uploading voice message');
    } finally {
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime('00:00');
      recordingStartTimeRef.current = null;
    }
  }, [audioChunks, sendMessage]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaRecorder]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    try {
      const formattedContent = formatMessage(input);
      await sendMessage(formattedContent);
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      handleSendMessage();
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
        <button onClick={handleLogin}>Login</button>
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
          <div ref={messagesEndRef} />
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
        {isRecording || isPaused ? (
          <div className="recording-timer">
            <span>🔴 {recordingTime}</span>
            <button className="pause-button" onClick={pauseRecording}>
              {isPaused ? "Resume" : "Pause"}
            </button>
          </div>
        ) : (
          <button className="icon" onMouseDown={startRecording}>
            🎤
          </button>
        )}
        <button 
          className="send-button" 
          onClick={isPaused ? sendVoiceMessage : handleSendMessage}
        >
          ➤
        </button>
      </footer>
    </div>
  );
}
