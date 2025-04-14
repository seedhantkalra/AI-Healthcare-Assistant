import React from "react";
import "./ChatMessage.css";


// Defines the structure of a single chat message
interface Message {
  role: "user" | "assistant"; // Indicates who sent the message
  content: string;            // The actual message text
}

// Props expected by the ChatMessage component
interface Props {
  message: Message;
}

// ChatMessage renders a single message bubble
function ChatMessage({ message }: Props) {
  const isUser = message.role === "user"; // Check if the sender is the user

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
