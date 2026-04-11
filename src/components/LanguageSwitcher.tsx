"use client";

import React from 'react';
import { Languages } from 'lucide-react';

import { useI18n } from '../i18n/LanguageContext';
import type { Language } from '../i18n/translations';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', compact = false }) => {
  const { language, setLanguage, languageOptions, t } = useI18n();

  return (
    <div
      className={`inline-flex items-center gap-2 h-10 px-3 rounded-full border border-outline-variant/20 bg-white/90 backdrop-blur-md shadow-sm ${className}`.trim()}
    >
      <Languages size={16} className="text-primary" />
      {!compact && (
        <label htmlFor="language-switcher" className="text-xs font-bold text-on-surface-variant">
          {t('Language')}
        </label>
      )}
      <select
        id="language-switcher"
        className={`text-sm bg-transparent border-none font-semibold text-primary focus:outline-none focus:ring-0 ${compact ? 'min-w-[84px]' : 'min-w-[92px]'}`}
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
