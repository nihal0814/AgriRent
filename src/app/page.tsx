"use client";

import App from '../App';
import { LanguageProvider } from '../i18n/LanguageContext';

export default function HomePage() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}
