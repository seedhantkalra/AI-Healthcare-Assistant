import React, { useEffect, useRef, useState } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeThread?.messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !activeThread) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedThreads = threads.map((t) =>
      t.id === activeThreadId
        ? { ...t, messages: [...t.messages, userMessage] }
        : t
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

      const aiMessage: Message = { role: 'assistant', content: response.data.response };

      const newThreads = threads.map((t) =>
        t.id === activeThreadId
          ? { ...t, messages: [...t.messages, aiMessage] }
          : t
      );
      setThreads(newThreads);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  const startNewChat = () => {
    const newId = threads.length > 0 ? Math.max(...threads.map((t) => t.id)) + 1 : 1;
    setThreads([...threads, { id: newId, messages: [] }]);
    setActiveThreadId(newId);
  };

  const closeChat = (id: number) => {
    if (threads.length === 1) return;
    const updated = threads.filter((t) => t.id !== id);
    setThreads(updated);
    if (activeThreadId === id && updated.length > 0) {
      setActiveThreadId(updated[0].id);
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2 className="header">AI Healthcare Assistant</h2>
        <button className="new-chat-btn" onClick={startNewChat}>
          + New Chat
        </button>
        {threads.map((t) => (
          <div
            key={t.id}
            className={`chat-tab ${t.id === activeThreadId ? 'active' : ''}`}
            onClick={() => setActiveThreadId(t.id)}
          >
            Chat {t.id}
            {threads.length > 1 && (
              <button className="close-btn" onClick={(e) => {
                e.stopPropagation();
                closeChat(t.id);
              }}>×</button>
            )}
          </div>
        ))}
      </div>

      <div className="chat-area">
        <div className="messages">
          {activeThread?.messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-area">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
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
