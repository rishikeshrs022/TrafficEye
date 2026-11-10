import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    const savedRole = localStorage.getItem('role');

    if (savedToken && savedUsername && savedRole) {
      setUser({
        username: savedUsername,
        role: savedRole,
        token: savedToken
      });
      // Set axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        username,
        password
      });
      
      const { access_token, role } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('username', username);
      localStorage.setItem('role', role);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      const loggedUser = { username, role, token: access_token };
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      // Offline fallback for static deployments (e.g. GitHub Pages)
      if ((username === 'admin' && password === 'admin123') || username.toLowerCase().includes('police') || username.toLowerCase().includes('authority')) {
        const fallbackRole = username.toLowerCase().includes('police') ? 'Traffic Police' : username.toLowerCase().includes('authority') ? 'City Authority' : 'Admin';
        const demoUser = { username, role: fallbackRole, token: 'demo-jwt-token' };
        localStorage.setItem('token', demoUser.token);
        localStorage.setItem('username', demoUser.username);
        localStorage.setItem('role', demoUser.role);
        setUser(demoUser);
        return demoUser;
      }
      throw new Error(error.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
