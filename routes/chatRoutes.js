const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not defined in environment variables');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Remove the listModels function as it's not supported

// Use the correct model name for the current API version
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// Get all chats
router.get('/chats', async (req, res, next) => {
  try {
    const chats = await Chat.find().select('title createdAt updatedAt').sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    next(error);
  }
});

// Get a specific chat by ID
router.get('/chats/:id', async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    res.json(chat);
  } catch (error) {
    next(error);
  }
});

// Create a new chat
router.post('/chats', async (req, res, next) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    console.log('Creating new chat with message:', message);
    
    try {
      // Get response from Gemini
      const result = await model.generateContent(message);
      const response = result.response.text();
      
      console.log('Received response from Gemini API');
      
      // Create a new chat with the user message and AI response
      const newChat = new Chat({
        title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
        messages: [
          { role: 'user', content: message },
          { role: 'assistant', content: response }
        ]
      });
      
      const savedChat = await newChat.save();
      console.log('Chat saved to MongoDB with ID:', savedChat._id);
      
      res.status(201).json(savedChat);
    } catch (error) {
      console.error('Error with Gemini API or saving to MongoDB:', error);
      res.status(500).json({ 
        message: 'Error processing your request',
        error: error.message
      });
    }
  } catch (error) {
    next(error);
  }
});

// Add a message to an existing chat
router.post('/chats/:id/messages', async (req, res, next) => {
  try {
    const { message } = req.body;
    const chatId = req.params.id;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Add user message
    chat.messages.push({ role: 'user', content: message });
    
    try {
      // Get response from Gemini
      const result = await model.generateContent(message);
      const response = result.response.text();
      
      // Add AI response
      chat.messages.push({ role: 'assistant', content: response });
      
      const updatedChat = await chat.save();
      res.json(updatedChat);
    } catch (error) {
      console.error('Error with Gemini API:', error);
      res.status(500).json({ 
        message: 'Error processing your request',
        error: error.message
      });
    }
  } catch (error) {
    next(error);
  }
});

// Delete a chat
router.delete('/chats/:id', async (req, res, next) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add this new route to your existing routes

// Update a specific message in a chat
router.put('/chats/:id/messages/:index', async (req, res, next) => {
  try {
    const { content } = req.body;
    const chatId = req.params.id;
    const messageIndex = parseInt(req.params.index);
    
    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if message index is valid
    if (messageIndex < 0 || messageIndex >= chat.messages.length) {
      return res.status(400).json({ message: 'Invalid message index' });
    }
    
    // Check if it's a user message (only allow editing user messages)
    if (chat.messages[messageIndex].role !== 'user') {
      return res.status(403).json({ message: 'Can only edit user messages' });
    }
    
    // Update the message content
    chat.messages[messageIndex].content = content;
    
    // If this isn't the last message, we need to regenerate AI responses
    if (messageIndex < chat.messages.length - 1) {
      // Remove all messages after the edited one
      chat.messages = chat.messages.slice(0, messageIndex + 1);
      
      try {
        // Get response from Gemini
        const result = await model.generateContent(content);
        const response = result.response.text();
        
        // Add AI response
        chat.messages.push({ role: 'assistant', content: response });
      } catch (error) {
        console.error('Error with Gemini API:', error);
        return res.status(500).json({ 
          message: 'Error processing your request',
          error: error.message
        });
      }
    }
    
    const updatedChat = await chat.save();
    res.json(updatedChat);
  } catch (error) {
    next(error);
  }
});
module.exports = router;