import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import ChatMessage from './ChatMessage';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Thread = {
  id: number;
  messages: Message[];
};

function App() {
  const [threads, setThreads] = useState<Thread[]>([{ id: 1, messages: [] }]);
  const [activeThreadId, setActiveThreadId] = useState(1);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const activeThread = threads.find(thread => thread.id === activeThreadId);

  const sendMessage = async () => {
    if (!input.trim() || loading || !activeThread) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedThreads = threads.map(thread =>
      thread.id === activeThreadId
        ? { ...thread, messages: [...thread.messages, userMessage] }
        : thread
    );
    setThreads(updatedThreads);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        '/api/chat',
        { message: input },
        {
          headers: {
            Authorization:
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZW1vLXVzZXItMDAxIiwibmFtZSI6IkRyLiBFbWlseSIsImpvYlRpdGxlIjoiU3VyZ2VvbiIsIndvcmtwbGFjZSI6IlN1bm55YnJvb2sgSGVhbHRoIENlbnRyZSIsImlhdCI6MTc0MzcxMzk1NiwiZXhwIjoxNzQzNzE3NTU2fQ.B-grEfW9q26YO0sWJ_9bw91W-coUuUQAnumaPlTA074',
            'Content-Type': 'application/json',
          },
        }
      );

      const aiMessage: Message = {
        role: 'assistant',
        content: response.data.response,
      };

      setThreads(prev =>
        prev.map(thread =>
          thread.id === activeThreadId
            ? { ...thread, messages: [...thread.messages, aiMessage] }
            : thread
        )
      );
    } catch (err) {
      console.error('Error contacting AI:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  const startNewChat = () => {
    const newId = threads.length > 0 ? Math.max(...threads.map(t => t.id)) + 1 : 1;
    const newThread: Thread = { id: newId, messages: [] };
    setThreads([...threads, newThread]);
    setActiveThreadId(newId);
  };

  const closeChat = (id: number) => {
    if (threads.length === 1) return; // Prevent deleting last chat
    const updatedThreads = threads.filter(thread => thread.id !== id);
    setThreads(updatedThreads);
    if (activeThreadId === id && updatedThreads.length > 0) {
      setActiveThreadId(updatedThreads[0].id);
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2 className="header">AI Healthcare Assistant</h2>
        <button className="new-chat-btn" onClick={startNewChat}>
          + New Chat
        </button>
        {threads.map(thread => (
          <div
            key={thread.id}
            className={`chat-tab ${thread.id === activeThreadId ? 'active' : ''}`}
            onClick={() => setActiveThreadId(thread.id)}
          >
            Chat {thread.id}
            {threads.length > 1 && (
              <button className="close-btn" onClick={e => {
                e.stopPropagation();
                closeChat(thread.id);
              }}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="chat-area">
        <div className="messages">
          {activeThread?.messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
        </div>
        <div className="input-area">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
          />
          <button onClick={sendMessage} disabled={loading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
