import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';

const EmojiGifPicker = ({ onSelect, onClose }) => {
  const [isGifMode, setIsGifMode] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // In SimpleEmojiGifPicker.js, update the GIF mode section:

const searchGifs = async () => {
    if (!searchTerm) return;
    setLoading(true);
    setGifs([]); // Clear existing GIFs
    
    try {
      console.log('Searching for GIFs:', searchTerm); // Debug log
      
      const response = await fetch(`/api/emojigifpicker?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      console.log('GIF search response:', data); // Debug log
      
      if (data.success && data.results) {
        setGifs(data.results);
      } else {
        console.error('Error fetching GIFs:', data.error);
      }
    } catch (error) {
      console.error('Error in GIF search:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Update the GIF rendering section:
  {isGifMode && (
    <div className="p-2">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
          placeholder="Search GIFs..."
          className="flex-1 p-2 border rounded"
        />
        <button 
          onClick={searchGifs}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔍
        </button>
      </div>
      <div className="h-60 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : gifs.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            {searchTerm ? 'No GIFs found' : 'Search for GIFs'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <div 
                key={gif.id} 
                className="relative group cursor-pointer"
                onClick={() => handleGifSelect(gif)}
              >
                <img
                  src={gif.media_formats.tinygif.url}
                  alt={gif.title || 'GIF'}
                  className="w-full h-32 object-cover rounded-lg hover:opacity-75 transition-opacity"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}
  
  // Update handleGifSelect function:
  const handleGifSelect = async (gif) => {
    try {
      console.log('Selected GIF:', gif); // Debug log
      
      const fileResponse = await fetch(gif.media_formats.gif.url);
      if (!fileResponse.ok) {
        throw new Error(`HTTP error! status: ${fileResponse.status}`);
      }
      
      const blob = await fileResponse.blob();
      const file = new File([blob], `tenor-${gif.id}.gif`, { type: 'image/gif' });
      onSelect(file);
      onClose();
    } catch (error) {
      console.error('Error handling GIF selection:', error);
      alert('Failed to load GIF. Please try again.');
    }
  };

  const handleEmojiClick = (emojiData) => {
    onSelect(emojiData.emoji);
    onClose();
  };

  return (
    <div 
      ref={pickerRef}
      className="absolute bottom-16 left-0 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
    >
      <div className="flex border-b border-gray-200">
      <button
    className={`flex-1 p-2 text-gray-700 ${!isGifMode ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
    onClick={() => setIsGifMode(false)}
  >
    Emojis
  </button>
  <button
    className={`flex-1 p-2 text-gray-700 ${isGifMode ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
    onClick={() => setIsGifMode(true)}
  >
    GIFs
  </button>
      </div>

      {isGifMode ? (
        <div className="p-2 w-72">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
              placeholder="Search GIFs..."
              className="flex-1 text-gray-500 p-2 border rounded"
            />
            <button 
              onClick={searchGifs}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              🔍
            </button>
          </div>
          <div className="h-60 overflow-y-auto grid grid-cols-2 gap-2">
            {loading ? (
              <div className="col-span-2 flex justify-center items-center">
                Loading...
              </div>
            ) : (
              gifs.map((gif) => (
                <img
                  key={gif.id}
                  src={gif.media_formats.tinygif.url}
                  alt={gif.content_description}
                  onClick={() => handleGifSelect(gif)}
                  className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div style={{ height: '400px' }}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme="light"
          />
        </div>
      )}
    </div>
  );
};

export default EmojiGifPicker;