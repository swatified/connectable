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

  const searchGifs = async () => {
    if (!searchTerm) return;
    setLoading(true);
    setGifs([]);
    
    try {
      const response = await fetch(`/api/emojigifpicker?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();

      if (data.success && data.results) {
        setGifs(data.results);
        console.log('Fetched GIF data:', data);
      } else {
        console.error('Error fetching GIFs:', data.error);
      }
    } catch (error) {
      console.error('Error in GIF search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGifSelect = async (gif) => {
    try {
      console.log('Selected GIF:', gif);
      
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