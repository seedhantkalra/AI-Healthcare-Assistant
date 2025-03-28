// src/Login.tsx

import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

type Props = {
  onLogin: (userId: string) => void;
};

const Login: React.FC<Props> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [workplace, setWorkplace] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = `${name}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase();

    try {
      await axios.post('/api/create-user', {
        userId,
        name,
        jobTitle,
        workplace
      });

      localStorage.setItem('userId', userId);
      onLogin(userId);
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Something went wrong. Try again.');
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome 👋</h2>
      <p>Enter your details to get started</p>
      <form onSubmit={handleSubmit} className="login-form">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required />
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job Title" required />
        <input value={workplace} onChange={(e) => setWorkplace(e.target.value)} placeholder="Workplace" required />
        <button type="submit">Enter Chat</button>
      </form>
    </div>
  );
};

export default Login;
