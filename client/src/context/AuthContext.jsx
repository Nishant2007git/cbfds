import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, setRefreshToken, getRefreshToken, setAuthCallbacks } from '../utils/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(false);

  const handleLogoutState = () => {
    setAccessToken(null);
    setUser(null);
    setRefreshToken(null);
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
        const res = await api.post('/auth/refresh', { refreshToken: getRefreshToken() });
        if (res.data && res.data.data) {
          const { accessToken, user: userData } = res.data.data;
          setRefreshToken(res.data.data.refreshToken);
          setAccessToken(accessToken);
          setUser(userData);
        } else {
          handleLogoutState();
        }
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
    if (!res.data || typeof res.data !== 'object' || !res.data.data) {
      const isHtml = typeof res.data === 'string' && res.data.includes('<!DOCTYPE');
      throw new Error(
        isHtml
          ? 'Backend API URL misconfigured or unreachable. Please set VITE_API_URL in Render environment settings.'
          : (res.data?.message || 'Invalid server response.')
      );
    }
    const { accessToken, refreshToken, user: userData } = res.data.data;
    setRefreshToken(refreshToken);
    setAccessToken(accessToken);
    setUser(userData);
    setShowSplash(true); // Trigger splash animation on login
    return userData;
  };

  const register = async (fullName, email, password, confirmPassword) => {
    const finalConfirmPassword = confirmPassword || password;
    const res = await api.post('/auth/register', {
      fullName,
      email,
      password,
      confirmPassword: finalConfirmPassword
    });

    if (!res.data || typeof res.data !== 'object') {
      const isHtml = typeof res.data === 'string' && res.data.includes('<!DOCTYPE');
      throw new Error(
        isHtml
          ? 'Backend API URL misconfigured or unreachable. Please set VITE_API_URL in Render environment settings.'
          : (res.data?.message || 'Invalid server response.')
      );
    }

    // If backend returns session tokens directly, authenticate immediately without extra call
    if (res.data?.data?.accessToken && res.data?.data?.refreshToken) {
      const { accessToken, refreshToken, user: userData } = res.data.data;
      setRefreshToken(refreshToken);
      setAccessToken(accessToken);
      setUser(userData);
      setShowSplash(true);
      return userData;
    }

    // Fallback: Authenticate via login endpoint
    return await login(email, password);
  };

  const triggerSplash = () => {
    setShowSplash(true);
  };

  useEffect(() => {
    const handleTrigger = () => setShowSplash(true);
    window.addEventListener('cbfds-play-splash', handleTrigger);
    return () => window.removeEventListener('cbfds-play-splash', handleTrigger);
  }, []);

  const completeSplash = () => {
    setShowSplash(false);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: getRefreshToken() });
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
        triggerSplash,
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
