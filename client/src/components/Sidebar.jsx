import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa'; // Assuming you're using react-icons

function Sidebar() {
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const response = await axios.get('/api/chats');
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const handleChatClick = (chatId) => {
    navigate(`/chat/${chatId}`);
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await axios.delete(`/api/chats/${chatId}`);
        // Remove the deleted chat from the state
        setChats(chats.filter(chat => chat._id !== chatId));
        
        // If the user is currently viewing the deleted chat, redirect to home
        if (window.location.pathname === `/chat/${chatId}`) {
          navigate('/');
        }
      } catch (error) {
        console.error('Error deleting chat:', error);
      }
    }
  };

  return (
    <div className="sidebar">
      <h2>Your Chats</h2>
      <ul className="chat-list">
        {chats.map(chat => (
          <li 
            key={chat._id} 
            className="chat-item"
            onClick={() => handleChatClick(chat._id)}
          >
            <span className="chat-title">{chat.title}</span>
            <button 
              className="delete-btn"
              onClick={(e) => handleDeleteChat(e, chat._id)}
              title="Delete chat"
            >
              <FaTrash />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;