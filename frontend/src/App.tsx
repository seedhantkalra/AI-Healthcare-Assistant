import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import ChatMessage from './ChatMessage';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const userId = localStorage.getItem('userId') || '';
      const response = await axios.post(
        '/api/chat',
        { message: input, userId },
        { headers: { 'x-user-id': userId } }
      );
      const aiMessage: Message = { role: 'assistant', content: response.data.response };
      setMessages((prev) => [...prev, aiMessage]);
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
        <h1 className="header">
          <img src="/icon-stethoscope.svg" alt="icon" className="icon" />
          AI Healthcare Assistant
        </h1>

        <div className="chat-box">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} content={msg.content} />
          ))}
          {loading && <div className="loading">AI is typing...</div>}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <input
            type="text"
            placeholder="Ask a healthcare question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button onClick={sendMessage} disabled={loading}>
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
