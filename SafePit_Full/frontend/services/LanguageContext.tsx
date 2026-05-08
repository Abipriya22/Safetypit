// frontend/services/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang, translate } from '../i18n/translations';
import { storage } from './api';

const LANG_KEY = 'app_language';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  T: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('English');

  // Load saved language on app start
  useEffect(() => {
    const loadLang = async () => {
      try {
        // First check AsyncStorage directly (fastest)
        const saved = await AsyncStorage.getItem(LANG_KEY);
        if (saved) {
          setLangState(saved as Lang);
          return;
        }
        // Fallback: check user object
        const user = await storage.getUser();
        if (user?.preferred_lang) {
          setLangState(user.preferred_lang as Lang);
          await AsyncStorage.setItem(LANG_KEY, user.preferred_lang);
        }
      } catch (err) {
        console.log('LanguageContext load error:', err);
      }
    };
    loadLang();
  }, []);

  // setLang: updates state + persists to AsyncStorage immediately
  const setLang = async (newLang: Lang) => {
    try {
      setLangState(newLang);
      // Persist so app restart remembers the language
      await AsyncStorage.setItem(LANG_KEY, newLang);
      // Also update user object in storage
      const user = await storage.getUser();
      if (user) {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          await storage.saveAuth(token, { ...user, preferred_lang: newLang });
        }
      }
    } catch (err) {
      console.log('setLang error:', err);
    }
  };

  const T = (key: string): string => translate(lang, key);

  return (
    <LanguageContext.Provider value={{ lang, setLang, T }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};