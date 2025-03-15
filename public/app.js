document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const chatList = document.getElementById('chat-list');
  const chatContainer = document.getElementById('chat-container');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const newChatBtn = document.getElementById('new-chat-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  
  // Current chat ID
  let currentChatId = null;
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.innerHTML = '<span class="material-icons">light_mode</span>';
  }
  
  // Theme toggle functionality
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    // Update button icon
    if (document.body.classList.contains('dark-mode')) {
      themeToggleBtn.innerHTML = '<span class="material-icons">light_mode</span>';
      localStorage.setItem('theme', 'dark');
    } else {
      themeToggleBtn.innerHTML = '<span class="material-icons">dark_mode</span>';
      localStorage.setItem('theme', 'light');
    }
  });
  
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
        
        // Create chat item content div
        const chatItemContent = document.createElement('div');
        chatItemContent.className = 'chat-item-content';
        
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = 'chat';
        
        const title = document.createElement('span');
        title.className = 'chat-title';
        title.textContent = chat.title || 'New Chat';
        
        chatItemContent.appendChild(icon);
        chatItemContent.appendChild(title);
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chat-btn';
        deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
        deleteBtn.title = 'Delete chat';
        
        // Add event listeners
        chatItemContent.addEventListener('click', () => loadChat(chat._id));
        
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteChat(chat._id);
        });
        
        // Append elements to chat item
        chatItem.appendChild(chatItemContent);
        chatItem.appendChild(deleteBtn);
        
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
    
    messages.forEach((message, index) => {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${message.role}-message`;
      
      // Create message content container
      const contentElement = document.createElement('div');
      contentElement.className = 'message-content';
      contentElement.textContent = message.content;
      
      messageElement.appendChild(contentElement);
      
      // Only add edit button to user messages
      if (message.role === 'user') {
        const actionsElement = document.createElement('div');
        actionsElement.className = 'message-actions';
        
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.innerHTML = '<span class="material-icons">edit</span>';
        editButton.title = 'Edit message';
        
        editButton.addEventListener('click', () => {
          // Create edit mode
          const editArea = document.createElement('textarea');
          editArea.className = 'edit-textarea';
          editArea.value = message.content;
          
          // Replace content with textarea
          contentElement.innerHTML = '';
          contentElement.appendChild(editArea);
          
          // Add save button
          const saveButton = document.createElement('button');
          saveButton.className = 'save-button';
          saveButton.innerHTML = '<span class="material-icons">check</span>';
          saveButton.title = 'Save changes';
          
          // Replace edit button with save button
          actionsElement.innerHTML = '';
          actionsElement.appendChild(saveButton);
          
          // Focus textarea
          editArea.focus();
          
          // Save edited message
          saveButton.addEventListener('click', async () => {
            const newContent = editArea.value.trim();
            
            if (newContent && newContent !== message.content) {
              try {
                const response = await fetch(`/api/chats/${currentChatId}/messages/${index}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ content: newContent })
                });
                
                if (response.ok) {
                  // Reload the chat to show updated messages
                  loadChat(currentChatId);
                } else {
                  throw new Error('Failed to update message');
                }
              } catch (error) {
                console.error('Error updating message:', error);
                alert('Failed to update message. Please try again.');
              }
            } else {
              // If no changes or empty content, just exit edit mode
              contentElement.textContent = message.content;
              actionsElement.innerHTML = '';
              actionsElement.appendChild(editButton);
            }
          });
          
          // Cancel edit on Escape key
          editArea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              contentElement.textContent = message.content;
              actionsElement.innerHTML = '';
              actionsElement.appendChild(editButton);
            }
          });
        });
        
        actionsElement.appendChild(editButton);
        messageElement.appendChild(actionsElement);
      }
      
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
  
  async function deleteChat(chatId) {
    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }
    
    try {
      // Show loading state or disable the button
      const deleteBtn = document.querySelector(`.delete-chat-btn[data-id="${chatId}"]`);
      if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="material-icons">hourglass_empty</span>';
      }
      
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Parse the response as JSON if possible
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = await response.text();
      }
      
      if (response.ok) {
        // If the deleted chat was the current one, reset the view
        if (chatId === currentChatId) {
          currentChatId = null;
          showEmptyState();
        }
        
        // Refresh chat history
        loadChatHistory();
      } else {
        console.error('Failed to delete chat:', errorData);
        alert(`Failed to delete chat: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('An error occurred while deleting the chat.');
    } finally {
      // Reset the delete button if it exists
      const deleteBtn = document.querySelector(`.delete-chat-btn[data-id="${chatId}"]`);
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
      }
    }
  }
})