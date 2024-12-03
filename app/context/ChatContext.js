'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

const ChatContext = createContext();

export const useChatContext = () => useContext(ChatContext);

export function ChatProvider({ children }) {
  const [username, setUsername] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [messages, setMessages] = useState([]);
  const [savedMessages, setSavedMessages] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [windowFocused, setWindowFocused] = useState(true);
  const [notificationCooldown, setNotificationCooldown] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState(null);
  const notificationSound = useRef(null);
  const fileCache = useRef({}); // Updated: Using useRef for fileCache

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
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  };

  const login = async (password) => {
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
        throw new Error('Invalid username or password');
      }
    } catch (error) {
      console.error('Login failed:', error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('username');
    setAuthenticated(false);
    setUsername('');
    setMessages([]);
    setSavedMessages([]);
  };

  const sendMessage = async (content, messageType = 'text') => {
    try {
      const res = await fetch('/api/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          content,
          messageType,
          _id: Date.now().toString(),
          timestamp: new Date().toISOString()
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
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
      throw error;
    }
  };

  const clearDatabase = async () => {
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
      throw error;
    }
  };

  const handleNotification = async () => {
    if (notificationCooldown) {
      const remainingTime = Math.ceil((300000 - (Date.now() - lastNotificationTime)) / 60000);
      throw new Error(`Please wait ${remainingTime} minutes before sending another notification`);
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
        setTimeout(() => {
          setNotificationCooldown(false);
        }, 300000);
        return `Notification sent to ${username === 'user1' ? 'user2' : 'user1'}!`;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  };

  const fetchFileData = async (fileId) => { // Updated fetchFileData function
    if (fileCache.current[fileId]) {
      return fileCache.current[fileId];
    }

    try {
      const response = await fetch(`/api/files/${fileId}`);
      const data = await response.json();

      if (data.success) {
        fileCache.current[fileId] = data; // Updated: Directly assign to fileCache.current
        return data;
      }
    } catch (error) {
      console.error('Error fetching file:', error);
    }

    return null;
  };

  const value = {
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
    handleNotification,
    fetchFileData
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}