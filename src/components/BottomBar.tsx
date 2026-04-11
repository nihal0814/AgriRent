import React from 'react';
import { 
  Store, 
  Tractor, 
  LayoutDashboard, 
  MessageCircle 
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { Page } from '../types';

interface BottomBarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({ currentPage, onNavigate }) => {
  const { t } = useI18n();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-4 pt-2 glass-effect z-50 border-t border-outline-variant/10 shadow-lg rounded-t-2xl">
      <button 
        onClick={() => onNavigate('landing')}
        className={`flex flex-col items-center justify-center px-5 py-1.5 transition-all active:scale-90 ${
          currentPage === 'landing' ? 'bg-primary-container text-primary rounded-xl' : 'text-on-surface-variant'
        }`}
      >
        <Store size={20} />
        <span className="text-[10px] font-semibold mt-1">{t('Marketplace')}</span>
      </button>
      
      <button 
        onClick={() => onNavigate('renter-dashboard')}
        className={`flex flex-col items-center justify-center px-5 py-1.5 transition-all active:scale-90 ${
          currentPage === 'renter-dashboard' ? 'bg-primary-container text-primary rounded-xl' : 'text-on-surface-variant'
        }`}
      >
        <Tractor size={20} />
        <span className="text-[10px] font-semibold mt-1">{t('Rentals')}</span>
      </button>
      
      <button 
        onClick={() => onNavigate('lister-dashboard')}
        className={`flex flex-col items-center justify-center px-5 py-1.5 transition-all active:scale-90 ${
          currentPage === 'lister-dashboard' ? 'bg-primary-container text-primary rounded-xl' : 'text-on-surface-variant'
        }`}
      >
        <LayoutDashboard size={20} />
        <span className="text-[10px] font-semibold mt-1">{t('Dashboard')}</span>
      </button>
      
      <button 
        onClick={() => onNavigate('messages')}
        className={`flex flex-col items-center justify-center px-5 py-1.5 transition-all active:scale-90 ${
          currentPage === 'messages' ? 'bg-primary-container text-primary rounded-xl' : 'text-on-surface-variant'
        }`}
      >
        <MessageCircle size={20} />
        <span className="text-[10px] font-semibold mt-1">{t('Messages')}</span>
      </button>
    </nav>
  );
};
