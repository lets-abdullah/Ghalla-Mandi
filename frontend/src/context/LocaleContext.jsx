import React, { createContext, useContext, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LocaleContext = createContext();

export { translations };

export const LocaleProvider = ({ children }) => {
  const locale = 'en';

  useEffect(() => {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }, []);

  const setLocale = () => {
    // Urdu switch disabled - locked to English
  };

  const toggleLocale = () => {
    // Urdu switch disabled - locked to English
  };

  const t = (key, params = {}) => {
    let text = translations['en']?.[key];
    if (!text) {
      // Convert camelCase key (e.g. "totalPurchases") to spaced Title Case words ("Total Purchases")
      text = key
        ? key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (str) => str.toUpperCase())
        : '';
    }
    if (typeof text === 'string' && params && typeof params === 'object') {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }
    return text;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, t, translations }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);
