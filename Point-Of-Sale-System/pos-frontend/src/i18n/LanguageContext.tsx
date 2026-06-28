/// <reference types="vite/client" />
import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './en';
import { ta } from './ta';

type Language = 'EN' | 'TA';
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('EN');

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as Language;
    if (saved === 'EN' || saved === 'TA') {
      setLanguage(saved);
    }
    // Also fetch from db if logged in
    const authStore = localStorage.getItem('auth-storage');
    if (authStore) {
      try {
        const token = JSON.parse(authStore).state?.accessToken;
        if (token) {
          fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(data => {
              if (data.language && (data.language === 'EN' || data.language === 'TA')) {
                setLanguage(data.language);
                localStorage.setItem('app_language', data.language);
              }
            })
            .catch(() => {});
        }
      } catch (e) {}
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: keyof Translations): string => {
    const translations = language === 'TA' ? ta : en;
    return translations[key] || en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
