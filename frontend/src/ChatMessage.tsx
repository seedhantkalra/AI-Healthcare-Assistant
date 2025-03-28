import React from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatMessage.css';

type Props = {
  role: 'user' | 'assistant';
  content: string;
};

function ChatMessage({ role, content }: Props) {
  return (
    <div className={`chat-message ${role}`}>
      <strong>{role === 'user' ? 'You' : 'AI'}:</strong>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default ChatMessage;
