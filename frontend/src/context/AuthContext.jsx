import React, { createContext, useContext, useState, useEffect } from 'react';
import { authFetch } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [shop, setShop] = useState(() => {
    try {
      const saved = localStorage.getItem('gm_shop');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('gm_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // Validate session on mount if token exists
  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem('gm_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await authFetch('/api/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
          setShop(res.shop || null);
          localStorage.setItem('gm_user', JSON.stringify(res.user));
          if (res.shop) localStorage.setItem('gm_shop', JSON.stringify(res.shop));
        } else {
          // Token invalid or expired
          logout();
        }
      } catch (err) {
        console.warn('Session verification warning:', err);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  // Sync token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('gm_token', token);
    } else {
      localStorage.removeItem('gm_token');
    }
  }, [token]);

  // Sync user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('gm_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gm_user');
    }
  }, [user]);

  // Sync shop to localStorage
  useEffect(() => {
    if (shop) {
      localStorage.setItem('gm_shop', JSON.stringify(shop));
    } else {
      localStorage.removeItem('gm_shop');
    }
  }, [shop]);

  // Authenticate user via backend API
  const authenticate = async (email, password) => {
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        body: {
          emailOrPhone: email.trim().toLowerCase(),
          password
        }
      });

      if (res.success && res.token) {
        setToken(res.token);
        setUser(res.user);
        setShop(res.shop || null);
        return { success: true, user: res.user, shop: res.shop };
      }

      return {
        success: false,
        message: res.message || 'Invalid email address or password.'
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Server connection failed.'
      };
    }
  };

  // Register account via backend API
  const registerAccount = async (data) => {
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        body: {
          ownerName: data.ownerName,
          shopName: data.shopName,
          phone: data.mobile || '',
          email: data.email.trim().toLowerCase(),
          password: data.password,
          city: data.city || '',
          address: data.address || ''
        }
      });

      if (res.success && res.token) {
        setToken(res.token);
        setUser(res.user);
        setShop(res.shop || null);
        return { success: true, user: res.user, shop: res.shop };
      }

      return {
        success: false,
        message: res.message || 'Registration failed.'
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Server connection failed.'
      };
    }
  };

  // Update profile details & password via backend API
  const updateProfile = async (profileData) => {
    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PUT',
        body: profileData
      });

      if (res.success) {
        if (res.user) setUser(res.user);
        if (res.shop) setShop(res.shop);
        return { success: true, message: res.message || 'Profile updated successfully!' };
      }

      return { success: false, message: res.message || 'Failed to update profile.' };
    } catch (err) {
      return { success: false, message: err.message || 'Server connection failed.' };
    }
  };

  const logout = () => {
    setUser(null);
    setShop(null);
    setToken(null);
    localStorage.removeItem('gm_user');
    localStorage.removeItem('gm_shop');
    localStorage.removeItem('gm_token');
  };

  return (
    <AuthContext.Provider value={{ user, shop, token, loading, authenticate, registerAccount, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
