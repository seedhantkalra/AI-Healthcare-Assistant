import React from 'react';
import './ChatMessage.css';

type Props = {
  role: 'user' | 'assistant';
  content: string;
};

function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`chat-message ${role}`}>
      <span className="label"><strong>{isUser ? 'You' : 'AI'}:</strong></span> {content}
    </div>
  );
}

export default ChatMessage;
