import React, { createContext, useState, useEffect, useContext } from 'react';
import { translations } from '../translations/translations';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Read saved preference from localStorage or default to 'en'
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('permitease_lang') || 'en';
  });

  const setLanguage = (newLang) => {
    if (newLang === 'en' || newLang === 'tl') {
      setLangState(newLang);
      localStorage.setItem('permitease_lang', newLang);
    }
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'tl' : 'en';
    setLanguage(nextLang);
  };

  const t = translations[lang] || translations.en;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
