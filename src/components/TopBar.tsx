import React, { useEffect, useState } from 'react';
import { Bell, Search, Menu, LogIn, LogOut, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '../i18n/LanguageContext';
import { Page } from '../types';

interface TopBarProps {
  onNavigate: (page: Page) => void;
  isAuthenticated: boolean;
  onLogout: () => void;
  currentPage: Page;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onNavigate,
  isAuthenticated,
  onLogout,
  currentPage,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
}) => {
  const { t } = useI18n();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const navItems: Array<{ id: Page; label: string }> = [
    { id: 'landing', label: t('Marketplace') },
    { id: 'renter-dashboard', label: t('Rentals') },
    { id: 'history', label: t('History') },
    { id: 'messages', label: t('Messages') },
    { id: 'settings', label: t('Profile') },
  ];

  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsNotificationsOpen(false);
  }, [currentPage]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit();
    setIsMobileNavOpen(false);
  };

  const handleNavigateFromMenu = (page: Page) => {
    onNavigate(page);
    setIsMobileNavOpen(false);
  };

  return (
    <header className="fixed top-0 w-full z-40 glass-effect shadow-sm border-b border-outline-variant/10">
      <div className="flex items-center justify-between px-6 h-16 w-full max-w-screen-2xl mx-auto lg:pl-72">
        <div className="flex items-center gap-4 min-w-0 flex-1 lg:flex-none">
          <button
            onClick={() => setIsMobileNavOpen((previous) => !previous)}
            aria-label="Toggle menu"
            className="lg:hidden p-2 text-primary hover:bg-surface-container-high rounded-full"
          >
            {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center bg-surface-container-high rounded-full px-4 py-1.5 gap-2 w-full max-w-md">
            <Search size={16} className="text-on-surface-variant" />
            <input 
              className="bg-transparent border-none focus:ring-0 text-sm w-full min-w-0" 
              placeholder={t('Search equipment...')}
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              type="text" 
            />
          </form>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`font-medium transition-colors ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher compact className="hidden sm:inline-flex" />
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen((previous) => !previous)}
              className="p-2 text-primary hover:bg-surface-container-high rounded-full transition-colors relative"
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary-container rounded-full"></span>
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 top-12 w-64 rounded-2xl border border-outline-variant/20 bg-white/95 backdrop-blur-md shadow-xl p-4">
                <p className="text-sm font-bold text-on-surface mb-1">{t('Notifications')}</p>
                <p className="text-xs text-on-surface-variant">{t('No new notifications right now.')}</p>
              </div>
            )}
          </div>
          {isAuthenticated ? (
            <>
              <button
                onClick={onLogout}
                className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-full transition-colors"
                title={t('Logout')}
              >
                <LogOut size={20} />
              </button>
              <div
                onClick={() => onNavigate('settings')}
                className="h-10 w-10 rounded-full overflow-hidden border-2 border-surface-container-highest cursor-pointer hover:border-primary transition-all"
              >
                <img
                  alt="User profile avatar"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9RtlpDc0jDW_q47yvlmmIMCw89kKAVxdtFCC_6l3O5r7R6UbMW8qN9Tuw2plbIBPKOiwpWf9hFdqtsi9i3tejBgOs3GyKmV7M2nx3F2wVdPMo629d-jrn4M-FOMBDwMCG4Y1xn7rmalf6Rtvud-FUxLdwPK_8LI1zkk_Stn3MbPUbG_xrxlz4mgt-6sqGsnOSOFisMnhpk6TT1TFgpB_6YZSXjjT7RCgpKV7DqSRqV3iYFVhAdWWgMatci3Enkpha8aqCIU5DAd8"
                />
              </div>
            </>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="flex items-center gap-2 px-4 h-10 rounded-full bg-primary text-white font-semibold hover:opacity-90 transition-all"
            >
              <LogIn size={16} />
              {t('Login')}
            </button>
          )}
        </div>
      </div>

      {isMobileNavOpen && (
        <div className="lg:hidden border-t border-outline-variant/10 bg-white/95 backdrop-blur-md px-4 py-4 space-y-4 shadow-lg">
          <form onSubmit={handleSearchSubmit} className="flex items-center bg-surface-container-high rounded-full px-4 py-2 gap-2">
            <Search size={16} className="text-on-surface-variant" />
            <input
              className="w-full bg-transparent border-none focus:ring-0 text-sm"
              placeholder={t('Search equipment...')}
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              type="text"
            />
          </form>

          <nav className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigateFromMenu(item.id)}
                  className={`px-4 py-2 rounded-xl text-left font-semibold transition-colors ${isActive ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface hover:bg-surface-container'}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-outline-variant/10 flex items-center justify-between gap-3">
            <LanguageSwitcher compact className="inline-flex" />
            {isAuthenticated ? (
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-secondary/10 text-secondary font-semibold"
              >
                <LogOut size={16} />
                {t('Logout')}
              </button>
            ) : (
              <button
                onClick={() => handleNavigateFromMenu('login')}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-primary text-white font-semibold"
              >
                <LogIn size={16} />
                {t('Login')}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
