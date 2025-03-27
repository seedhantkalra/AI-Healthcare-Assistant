import React, { useState } from 'react';
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

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('/api/chat', { message: input });
      const aiMessage: Message = { role: 'assistant', content: response.data.reply };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error contacting AI:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="app">
      <h1>🩺 AI Healthcare Assistant</h1>
      <div className="chat-box">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} content={msg.content} />
        ))}
        {loading && <div className="loading">AI is typing...</div>}
      </div>
      <div className="input-area">
        <input
          type="text"
          placeholder="Ask a healthcare question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
