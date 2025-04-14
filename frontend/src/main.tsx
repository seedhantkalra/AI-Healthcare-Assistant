import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Global styles applied across the app

// This is the main entry point for the React application.
// It renders the <App /> component inside the <div id="root"> element in index.html.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="chat-wrapper"> {/* Wrap here */}
      <App />
    </div>
  </React.StrictMode>
);
