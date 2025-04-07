import React from "react";
import "./ChatMessage.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  message: Message;
}

function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className="chat-message-wrapper">
      <div className={`chat-message ${message.role}`}>
        <div className="sender-label">{isUser ? "You:" : "AI:"}</div>
        {message.content}
      </div>
    </div>
  );
}

export default ChatMessage;
