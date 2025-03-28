import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Login from './Login';
import './index.css';

const Root = () => {
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '');

  return userId ? (
    <App />
  ) : (
    <Login onLogin={setUserId} />
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
