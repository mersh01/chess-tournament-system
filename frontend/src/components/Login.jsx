import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let result;
    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await register(formData.username, formData.email, formData.password);
    }
    
    if (result.success) {
      toast.success(isLogin ? 'Login successful!' : result.user?.role === 'admin' ? 'Admin account created!' : 'Registration successful! Please wait for admin approval.');
      if (onLoginSuccess) onLoginSuccess();
    } else {
      toast.error(result.error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? 'Login to Play' : 'Create Account'}</h2>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          )}
          
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          
          <button type="submit" className="auth-button">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        
        <p onClick={() => setIsLogin(!isLogin)} className="auth-switch">
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </p>
        
        {!isLogin && (
          <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', marginTop: '1rem' }}>
            Note: First user becomes Admin. Other users need admin approval.
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;