import { useState, useEffect, useMemo } from 'react';
import { useChatContext } from '../context/ChatContext';

const FileMessage = ({ messageData }) => {
  const [fileContent, setFileContent] = useState(null);
  const { fetchFileData } = useChatContext();

  const getFileIcon = (contentType) => {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎬';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('word') || contentType.includes('document')) return '📝';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊';
    return '📎';
  };

  const fileData = useMemo(() => {
    return messageData.fileId ? messageData : 
           (typeof messageData.content === 'string' ? JSON.parse(messageData.content) : messageData);
  }, [messageData]);

  useEffect(() => {
    let isMounted = true;
    const loadFileData = async () => {
      try {
        const data = await fetchFileData(fileData.fileId || fileData.id);
        if (isMounted && data) {
          setFileContent(data);
        }
      } catch (error) {
        console.error('Error fetching file:', error);
      }
    };

    loadFileData();

    return () => {
      isMounted = false;
    };
  }, [fileData, fetchFileData]);

  console.log('FileMessage rendering', fileData.fileId || fileData.id);

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

export default FileMessage;