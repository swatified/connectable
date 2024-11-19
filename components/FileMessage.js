import React from 'react';

const FileMessage = ({ messageData }) => {
  // Parse the message content if it's a string
  const fileData = typeof messageData.content === 'string' ? 
    JSON.parse(messageData.content) : messageData.content;

  // Function to render different file types
  const renderFileContent = () => {
    // Handle messages with fileInfo property (voice messages)
    if (messageData.fileInfo) {
      return (
        <div className="media-message">
          <audio controls className="chat-audio w-full rounded-lg">
            <source src={`/api/files/${messageData.fileInfo.id}`} type={messageData.fileInfo.type} />
            Your browser does not support audio playback.
          </audio>
          <div className="text-sm text-gray-500 mt-1">
            🎤 Voice Message ({messageData.fileInfo.duration}s)
          </div>
        </div>
      );
    }

    // Handle regular file messages
    const fileUrl = `/api/files/${fileData.fileId}`;
    
    // Image files
    if (fileData.contentType?.startsWith('image/')) {
      return (
        <div className="media-message">
          <img
            src={fileUrl}
            alt={fileData.filename}
            className="max-w-full rounded-lg shadow-md hover:shadow-lg transition-shadow"
            loading="lazy"
          />
          <div className="text-sm text-gray-500 mt-1">
            📎 {fileData.filename} ({fileData.size} MB)
          </div>
        </div>
      );
    }

    // Audio files
    if (fileData.contentType?.startsWith('audio/')) {
      return (
        <div className="media-message">
          <audio controls className="w-full rounded-lg">
            <source src={fileUrl} type={fileData.contentType} />
            Your browser does not support audio playback.
          </audio>
          <div className="text-sm text-gray-500 mt-1">
            🎵 {fileData.filename} ({fileData.size} MB)
          </div>
        </div>
      );
    }

    // Video files
    if (fileData.contentType?.startsWith('video/')) {
      return (
        <div className="media-message">
          <video 
            controls 
            className="w-full rounded-lg shadow-md"
          >
            <source src={fileUrl} type={fileData.contentType} />
            Your browser does not support video playback.
          </video>
          <div className="text-sm text-gray-500 mt-1">
            🎥 {fileData.filename} ({fileData.size} MB)
          </div>
        </div>
      );
    }

    // Default file link for other types
    return (
      <div className="file-message p-2 bg-gray-100 rounded-lg">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          📎 {fileData.filename} ({fileData.size} MB)
        </a>
      </div>
    );
  };

  return (
    <div className="max-w-lg">
      {renderFileContent()}
    </div>
  );
};

export default FileMessage;