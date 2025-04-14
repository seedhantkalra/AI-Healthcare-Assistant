import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';
import ChatMessage from './ChatMessage';

// Type definition for each message
type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// Type definition for each conversation thread
type Thread = {
  id: number;
  messages: Message[];
};

function App() {
  // Tracks all threads and messages
  const [threads, setThreads] = useState<Thread[]>([{ id: 1, messages: [] }]);
  const [activeThreadId, setActiveThreadId] = useState(1); // Which thread is currently active
  const [input, setInput] = useState(''); // Current input text
  const [loading, setLoading] = useState(false); // True while waiting for AI to respond

  const messagesEndRef = useRef<HTMLDivElement>(null); // Used to scroll to latest message

  // Finds the current active thread object
  const activeThread = threads.find((t) => t.id === activeThreadId);

  // Automatically scroll to bottom whenever messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeThread?.messages]);

  // Sends a message and gets a response from the AI
  const sendMessage = async () => {
    if (!input.trim() || loading || !activeThread) return;

    // Construct user message object
    const userMessage: Message = { role: 'user', content: input };

    // Immediately add the user's message to the thread
    const updatedThreads = threads.map((t) =>
      t.id === activeThreadId
        ? { ...t, messages: [...t.messages, userMessage] }
        : t
    );

    setThreads(updatedThreads); // Update UI
    setInput(''); // Clear input box
    setLoading(true); // Disable send button

    try {
      // Send message to backend
      const response = await axios.post(
        '/api/chat',
        { message: userMessage.content },
        {
          headers: {
            Authorization:
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZW1vLXVzZXItMDAxIiwibmFtZSI6IkRyLiBFbWlseSIsImpvYlRpdGxlIjoiU3VyZ2VvbiIsIndvcmtwbGFjZSI6IlN1bm55YnJvb2sgSGVhbHRoIENlbnRyZSIsImlhdCI6MTc0NDIyODk3OCwiZXhwIjoxNzQ0MjMyNTc4fQ.Ot42vNkmNvz9-esQ_TCjmkqhfjmPJ01klRHmIzDKb0E',
            'Content-Type': 'application/json',
          },
        }
      );

      // Build AI response message from backend result
      const aiMessage: Message = {
        role: 'assistant',
        content: response.data.response || 'No response.',
      };

      // Append the AI message to the correct thread
      setThreads((prevThreads) =>
        prevThreads.map((t) =>
          t.id === activeThreadId
            ? {
                ...t,
                messages: [...t.messages, aiMessage],
              }
            : t
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Triggers sendMessage() on pressing Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      sendMessage();
    }
  };

  // Starts a brand new chat thread
  const startNewChat = () => {
    const newId = threads.length > 0 ? Math.max(...threads.map((t) => t.id)) + 1 : 1;
    setThreads([...threads, { id: newId, messages: [] }]);
    setActiveThreadId(newId);
  };

  // Closes the selected chat thread
  const closeChat = (id: number) => {
    if (threads.length === 1) return; // Must keep at least one open
    const updated = threads.filter((t) => t.id !== id);
    setThreads(updated);

    // If current tab was closed, activate another one
    if (activeThreadId === id && updated.length > 0) {
      setActiveThreadId(updated[0].id);
    }
  };

  return (
    <div className="app">
      <div className="chat-header">
        <h2 className="header">AI Healthcare Assistant</h2>
        <button className="new-chat-btn" onClick={startNewChat}>
          + New Chat
        </button>
        <div className="tabs">
          {threads.map((t) => (
            <div
              key={t.id}
              className={`chat-tab ${t.id === activeThreadId ? 'active' : ''}`}
              onClick={() => setActiveThreadId(t.id)}
            >
              Chat {t.id}
              {threads.length > 1 && (
                <button
                  className="close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeChat(t.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        <div className="messages">
          {activeThread?.messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          {loading && (
            <ChatMessage
              key="typing-indicator"
              message={{ role: 'assistant', content: '...' }}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-area">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
