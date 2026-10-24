import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSwitchButton = ({ variant = 'default', style = {} }) => {
  const { lang, toggleLanguage } = useTranslation();

  const isEnglish = lang === 'en';

  if (variant === 'landing') {
    return (
      <button
        onClick={toggleLanguage}
        title={isEnglish ? 'Palitan sa Tagalog' : 'Switch to English'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.45rem 0.85rem',
          backgroundColor: '#F1F5F9',
          color: '#0F172A',
          border: '1px solid #CBD5E1',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          ...style
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E2E8F0';
          e.currentTarget.style.borderColor = '#94A3B8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#F1F5F9';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
      >
        <Globe size={15} style={{ color: '#167A3D' }} />
        <span>{isEnglish ? 'Tagalog' : 'English'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      className="btn btn-ghost"
      title={isEnglish ? 'Palitan sa Tagalog' : 'Switch to English'}
      aria-label="Toggle language"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.75rem',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: '0.8125rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        backgroundColor: 'var(--background, #F4F6F8)',
        border: '1px solid var(--border-light, #E8EDF2)',
        cursor: 'pointer',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary-green, #167A3D)';
        e.currentTarget.style.color = 'var(--primary-green, #167A3D)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-light, #E8EDF2)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
    >
      <Globe size={16} style={{ color: 'var(--primary-green, #167A3D)' }} />
      <span>{isEnglish ? 'Tagalog' : 'English'}</span>
    </button>
  );
};

export default LanguageSwitchButton;
