import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, setToken, getStoredUser, setStoredUser } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        setUser(null);
        setCompany(null);
        setLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
      setCompany(data.company);
      setStoredUser(data.user);
    } catch (err) {
      console.warn('Auth token invalid or expired:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (identifier, password) => {
    const data = await api.login({ identifier, password });
    setToken(data.token);
    setUser(data.user);
    setStoredUser(data.user);
    await fetchCurrentUser();
    return data;
  };

  const demoSwitch = async (role, email) => {
    const data = await api.demoSwitch(role, email);
    setToken(data.token);
    setUser(data.user);
    setStoredUser(data.user);
    await fetchCurrentUser();
    return data;
  };

  const logout = () => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, login, demoSwitch, logout, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
