import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
      connectSocket(token);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = (token) => {
    const newSocket = io(`${import.meta.env.VITE_API_URL}`, {
      auth: { token }
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
    });
    
    setSocket(newSocket);
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      connectSocket(token);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        username,
        email,
        password
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      connectSocket(token);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    if (socket) socket.disconnect();
    setUser(null);
    setSocket(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, socket }}>
      {children}
    </AuthContext.Provider>
  );
};