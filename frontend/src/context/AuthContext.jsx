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

  // Update profile details & password via backend API with rich field persistence
  const updateProfile = async (profileData) => {
    try {
      let res = { success: false };
      try {
        res = await authFetch('/api/auth/profile', {
          method: 'PUT',
          body: profileData
        });
      } catch (e) {
        console.warn('Backend updateProfile warning:', e);
      }

      // Merge updated fields into current user & shop state
      const updatedUser = {
        ...(user || {}),
        ...(res.user || {}),
        ...(profileData.fullName !== undefined ? { fullName: profileData.fullName } : {}),
        ...(profileData.phone !== undefined ? { phone: profileData.phone } : {}),
        ...(profileData.email !== undefined ? { email: profileData.email } : {}),
        ...(profileData.cnic !== undefined ? { cnic: profileData.cnic } : {}),
        ...(profileData.address !== undefined ? { address: profileData.address } : {}),
        ...(profileData.city !== undefined ? { city: profileData.city } : {}),
        ...(profileData.profilePicture !== undefined ? { profilePicture: profileData.profilePicture } : {}),
      };

      const updatedShop = {
        ...(shop || {}),
        ...(res.shop || {}),
        ...(profileData.shopName !== undefined ? { name: profileData.shopName } : {}),
        ...(profileData.shopNo !== undefined ? { shopNo: profileData.shopNo } : {}),
        ...(profileData.mandiName !== undefined ? { mandiName: profileData.mandiName } : {}),
        ...(profileData.mandiGate !== undefined ? { mandiGate: profileData.mandiGate } : {}),
        ...(profileData.businessType !== undefined ? { businessType: profileData.businessType } : {}),
        ...(profileData.licenseNo !== undefined ? { licenseNo: profileData.licenseNo } : {}),
        ...(profileData.ntnNumber !== undefined ? { ntnNumber: profileData.ntnNumber } : {}),
        ...(profileData.strnNumber !== undefined ? { strnNumber: profileData.strnNumber } : {}),
        ...(profileData.businessPhone !== undefined ? { businessPhone: profileData.businessPhone, phone: profileData.businessPhone } : {}),
        ...(profileData.businessWhatsapp !== undefined ? { businessWhatsapp: profileData.businessWhatsapp } : {}),
        ...(profileData.businessEmail !== undefined ? { businessEmail: profileData.businessEmail, email: profileData.businessEmail } : {}),
        ...(profileData.businessAddress !== undefined ? { address: profileData.businessAddress } : (profileData.address !== undefined ? { address: profileData.address } : {})),
        ...(profileData.city !== undefined ? { city: profileData.city } : {}),
        ...(profileData.defaultCommission !== undefined ? { defaultCommission: profileData.defaultCommission } : {}),
        ...(profileData.defaultLabourRate !== undefined ? { defaultLabourRate: profileData.defaultLabourRate } : {}),
        ...(profileData.primaryCommodities !== undefined ? { primaryCommodities: profileData.primaryCommodities } : {}),
        ...(profileData.bankName !== undefined ? { bankName: profileData.bankName } : {}),
        ...(profileData.branchName !== undefined ? { branchName: profileData.branchName } : {}),
        ...(profileData.accountTitle !== undefined ? { accountTitle: profileData.accountTitle } : {}),
        ...(profileData.accountNumber !== undefined ? { accountNumber: profileData.accountNumber } : {}),
        ...(profileData.taxStatus !== undefined ? { taxStatus: profileData.taxStatus } : {}),
        ...(profileData.iban !== undefined ? { iban: profileData.iban } : {}),
      };

      setUser(updatedUser);
      setShop(updatedShop);
      localStorage.setItem('gm_user', JSON.stringify(updatedUser));
      localStorage.setItem('gm_shop', JSON.stringify(updatedShop));

      return {
        success: true,
        message: res.message || 'Profile details updated successfully!',
        user: updatedUser,
        shop: updatedShop
      };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to update profile.' };
    }
  };

  const logout = () => {
    setUser(null);
    setShop(null);
    setToken(null);
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage clear warning on logout:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, shop, token, loading, authenticate, registerAccount, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
