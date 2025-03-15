document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const chatList = document.getElementById('chat-list');
  const chatContainer = document.getElementById('chat-container');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const newChatBtn = document.getElementById('new-chat-btn');
  
  // Current chat ID
  let currentChatId = null;
  
  // Load chat history
  loadChatHistory();
  
  // Show empty state initially
  showEmptyState();
  
  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  newChatBtn.addEventListener('click', startNewChat);
  
  // Functions
  async function loadChatHistory() {
    try {
      const response = await fetch('/api/chats');
      const chats = await response.json();
      
      chatList.innerHTML = '';
      
      if (chats.length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'chat-item';
        emptyItem.style.color = '#757575';
        emptyItem.style.justifyContent = 'center';
        emptyItem.textContent = 'No chats yet';
        chatList.appendChild(emptyItem);
        return;
      }
      
      chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.id = chat._id;
        
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = 'chat';
        
        const title = document.createElement('span');
        title.style.overflow = 'hidden';
        title.style.textOverflow = 'ellipsis';
        title.style.whiteSpace = 'nowrap';
        title.style.flex = '1';
        title.textContent = chat.title;
        
        chatItem.appendChild(icon);
        chatItem.appendChild(title);
        
        chatItem.addEventListener('click', () => loadChat(chat._id));
        
        chatList.appendChild(chatItem);
      });
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }
  
  async function loadChat(chatId) {
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      const chat = await response.json();
      
      currentChatId = chatId;
      
      // Update active chat in sidebar
      document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === chatId) {
          item.classList.add('active');
        }
      });
      
      // Display messages
      displayMessages(chat.messages);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  }
  
  function displayMessages(messages) {
    chatContainer.innerHTML = '';
    
    messages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${message.role}-message`;
      messageElement.textContent = message.content;
      chatContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    userInput.value = '';
    
    try {
      if (currentChatId) {
        // Add to existing chat
        await addMessageToChat(currentChatId, message);
      } else {
        // Create new chat
        await createNewChat(message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }
  
  async function createNewChat(message) {
    try {
      // Show user message immediately
      showUserMessage(message);
      
      // Show loading indicator
      const loadingElement = showLoadingIndicator();
      
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
      
      const newChat = await response.json();
      
      // Remove loading indicator
      loadingElement.remove();
      
      // Show AI response
      showAssistantMessage(newChat.messages[1].content);
      
      // Update current chat ID
      currentChatId = newChat._id;
      
      // Refresh chat history
      loadChatHistory();
      
      // Mark the new chat as active
      setTimeout(() => {
        document.querySelectorAll('.chat-item').forEach(item => {
          item.classList.remove('active');
          if (item.dataset.id === currentChatId) {
            item.classList.add('active');
          }
        });
      }, 100);
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }
  
  async function addMessageToChat(chatId, message) {
    try {
      // Show user message immediately
      showUserMessage(message);
      
      // Show loading indicator
      const loadingElement = showLoadingIndicator();
      
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add message to chat');
      }
      
      const updatedChat = await response.json();
      
      // Remove loading indicator
      loadingElement.remove();
      
      // Show AI response (last message in the chat)
      const assistantMessage = updatedChat.messages[updatedChat.messages.length - 1].content;
      showAssistantMessage(assistantMessage);
      
      // Refresh chat history
      loadChatHistory();
    } catch (error) {
      console.error('Error adding message to chat:', error);
      throw error;
    }
  }
  
  function showEmptyState() {
    chatContainer.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">chat</span>
        <h3>BestFriend AI</h3>
        <p>Ask me anything and I'll do my best to help! Your conversations will be saved for future reference.</p>
      </div>
    `;
  }
  
  function showUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    messageElement.textContent = message;
    chatContainer.appendChild(messageElement);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  function showAssistantMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message assistant-message';
    messageElement.textContent = message;
    chatContainer.appendChild(messageElement);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  function showLoadingIndicator() {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'message assistant-message loading';
    loadingElement.textContent = 'Thinking...';
    chatContainer.appendChild(loadingElement);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return loadingElement;
  }
  
  function startNewChat() {
    currentChatId = null;
    
    // Clear active state from all chats
    document.querySelectorAll('.chat-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Show empty state
    showEmptyState();
  }
  
  // Add delete functionality for chats
  chatList.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    
    // Check if right-clicked on a chat item
    if (e.target.classList.contains('chat-item')) {
      const chatId = e.target.dataset.id;
      
      if (confirm('Delete this chat?')) {
        try {
          const response = await fetch(`/api/chats/${chatId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            // If the deleted chat was the current one, reset the view
            if (chatId === currentChatId) {
              startNewChat();
            }
            
            // Refresh chat history
            loadChatHistory();
          }
        } catch (error) {
          console.error('Error deleting chat:', error);
        }
      }
    }
  });
});