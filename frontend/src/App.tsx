// Updated App.tsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import ChatMessage from './ChatMessage';
import { v4 as uuidv4 } from 'uuid';

// Dummy user info injected from mobile app (replace with real data via props or global state)
const userProfile = {
  userId: 'hos-user-001',
  name: 'Dr. Smith',
  jobTitle: 'Cardiologist',
  workplace: 'Credit Valley Hospital'
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Thread = {
  id: string;
  title: string;
  messages: Message[];
};

function App() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextChatNumber, setNextChatNumber] = useState(2); // Start from 2 after first chat
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeThread = threads.find(t => t.id === activeThreadId);

  useEffect(() => {
    if (threads.length === 0) {
      const newId = uuidv4();
      const newThread: Thread = {
        id: newId,
        title: 'Chat 1',
        messages: [],
      };
      setThreads([newThread]);
      setActiveThreadId(newId);

      // Create user profile on mount (once)
      axios.post('/api/create-user', userProfile).catch(err => {
        if (err.response?.data?.message !== 'User already exists.') {
          console.error('User creation failed:', err);
        }
      });
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  const startNewChat = () => {
    const newId = uuidv4();
    const newThread: Thread = {
      id: newId,
      title: `Chat ${nextChatNumber}`,
      messages: [],
    };
    setThreads(prev => [...prev, newThread]);
    setActiveThreadId(newId);
    setNextChatNumber(prev => prev + 1);
  };

  const switchThread = (id: string) => {
    setActiveThreadId(id);
  };

  const deleteThread = (id: string) => {
    setThreads(prev => {
      const updated = prev.filter(thread => thread.id !== id);
      if (id === activeThreadId && updated.length > 0) {
        setActiveThreadId(updated[0].id);
      }
      return updated;
    });
  };

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
        { message: input, userId: userProfile.userId },
        { headers: { 'x-user-id': userProfile.userId } }
      );
      const aiMessage: Message = { role: 'assistant', content: response.data.response };

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
    if (e.key === 'Enter' && !loading) {
      sendMessage();
    }
  };

  return (
    <div className="chat-wrapper">
      <div className="app-container">
        <div className="top-bar">
          <h1 className="header">
            <img src="/icon-stethoscope.svg" alt="icon" className="icon" />
            AI Healthcare Assistant
          </h1>
        </div>

        <div className="tab-bar">
          {threads.map(thread => (
            <div
              key={thread.id}
              className={`tab ${thread.id === activeThreadId ? 'active' : ''}`}
            >
              <span className="tab-title" onClick={() => switchThread(thread.id)}>
                {thread.title}
              </span>
              <button
                className="close-tab"
                onClick={() => threads.length > 1 && deleteThread(thread.id)}
                disabled={threads.length === 1}
              >
                ×
              </button>
            </div>
          ))}
          <div className="tab new-chat" onClick={startNewChat}>
            + New Chat
          </div>
        </div>

        <div className="chat-box">
          {activeThread?.messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} content={msg.content} />
          ))}
          {loading && <div className="loading">AI is typing...</div>}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <input
            type="text"
            placeholder={activeThread ? "Ask a healthcare question..." : "Start a new chat to begin"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!activeThread}
          />
          <button onClick={sendMessage} disabled={loading || !activeThread}>
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
