import React from 'react';
import { 
  Store,
  LayoutDashboard, 
  ClipboardList, 
  MessageSquare, 
  Wrench, 
  Settings, 
  History,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { t } = useI18n();

  const navItems: Array<{ id: Page; label: string; icon: LucideIcon }> = [
    { id: 'landing', label: t('Marketplace'), icon: Store },
    { id: 'lister-dashboard', label: t('Dashboard'), icon: LayoutDashboard },
    { id: 'renter-dashboard', label: t('Active Rentals'), icon: ClipboardList },
    { id: 'messages', label: t('Message Center'), icon: MessageSquare },
    { id: 'maintenance', label: t('Maintenance'), icon: Wrench },
    { id: 'settings', label: t('Settings'), icon: Settings },
    { id: 'history', label: t('History'), icon: History },
  ];

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen p-6 gap-4 bg-surface-container-low w-72 pt-6 z-70 border-r border-outline-variant/10">
      <div className="flex flex-col gap-1 mb-6">
        <span className="text-xl font-headline font-black text-primary">The Modern Agrarian</span>
        <span className="text-sm text-on-surface-variant/70">{t('Premium Equipment Rental')}</span>
      </div>
      
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-primary font-bold border-r-4 border-secondary-container bg-surface-container-highest' 
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Icon size={20} />
              <span className="font-headline font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button 
          onClick={() => onNavigate('list-equipment')}
          className="w-full py-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg"
        >
          <Plus size={20} />
          {t('List New Gear')}
        </button>
      </div>
    </aside>
  );
};
