import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, setToken, getStoredUser, setStoredUser } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSuperImpersonating, setIsSuperImpersonating] = useState(
    !!localStorage.getItem('dish_super_backup_token')
  );

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
      setIsSuperImpersonating(!!localStorage.getItem('dish_super_backup_token'));
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
    localStorage.removeItem('dish_super_backup_token');
    setIsSuperImpersonating(false);
    await fetchCurrentUser();
    return data;
  };

  const demoSwitch = async (role, email) => {
    const data = await api.demoSwitch(role, email);
    setToken(data.token);
    setUser(data.user);
    setStoredUser(data.user);
    localStorage.removeItem('dish_super_backup_token');
    setIsSuperImpersonating(false);
    await fetchCurrentUser();
    return data;
  };

  const autoLoginToCompany = async (companyId) => {
    const currentToken = getToken();
    if (currentToken && !localStorage.getItem('dish_super_backup_token')) {
      localStorage.setItem('dish_super_backup_token', currentToken);
    }
    const data = await api.autoLoginCompany(companyId);
    setToken(data.token);
    setUser(data.user);
    setStoredUser(data.user);
    setCompany(data.company);
    setIsSuperImpersonating(true);
    await fetchCurrentUser();
    return data;
  };

  const returnToSuperAdmin = async () => {
    const superToken = localStorage.getItem('dish_super_backup_token');
    if (superToken) {
      setToken(superToken);
      localStorage.removeItem('dish_super_backup_token');
      setIsSuperImpersonating(false);
      await fetchCurrentUser();
    }
  };

  const logout = () => {
    setToken(null);
    setStoredUser(null);
    localStorage.removeItem('dish_super_backup_token');
    setUser(null);
    setCompany(null);
    setIsSuperImpersonating(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      company,
      loading,
      login,
      demoSwitch,
      autoLoginToCompany,
      returnToSuperAdmin,
      isSuperImpersonating,
      logout,
      refreshUser: fetchCurrentUser,
      updateCompanyData: (newCompany) => setCompany(newCompany)
    }}>
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
