import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, setAuthCallbacks } from '../utils/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(false);

  const handleLogoutState = () => {
    setAccessToken(null);
    setUser(null);
    setShowSplash(false);
  };

  useEffect(() => {
    // Configure API callbacks
    setAuthCallbacks({
      onTokenRefreshed: (token, userData) => {
        setAccessToken(token);
        if (userData) setUser(userData);
      },
      onAuthFailed: () => {
        handleLogoutState();
      }
    });

    // Check existing session on boot using refresh token cookie
    const initSession = async () => {
      try {
        const res = await api.post('/auth/refresh');
        const { accessToken, user: userData } = res.data.data;
        setAccessToken(accessToken);
        setUser(userData);
        // No splash on session restore — only on explicit login
      } catch (err) {
        // No valid session cookie found
        handleLogoutState();
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: userData } = res.data.data;
    setAccessToken(accessToken);
    setUser(userData);
    setShowSplash(true); // Trigger splash animation on login
    return userData;
  };

  const register = async (fullName, email, password) => {
    const res = await api.post('/auth/register', { fullName, email, password });
    const { accessToken, user: userData } = res.data.data;
    setAccessToken(accessToken);
    setUser(userData);
    setShowSplash(true); // Trigger splash animation on register
    return userData;
  };

  const completeSplash = () => {
    setShowSplash(false);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      handleLogoutState();
    }
  };

  const refreshUserData = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.data) {
        setUser(res.data.data);
      }
    } catch (err) {
      // Ignore errors
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        showSplash,
        login,
        register,
        logout,
        completeSplash,
        refreshUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
