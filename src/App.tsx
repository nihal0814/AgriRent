"use client";

import React, { useState, useEffect } from 'react';
import { AuthUser, BookingConfirmationData, Page } from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { LandingPage } from './views/LandingPage';
import { LoginPage } from './views/LoginPage';
import { SignupPage } from './views/SignupPage';
import { ListerDashboard } from './views/ListerDashboard';
import { RenterDashboard } from './views/RenterDashboard';
import { EquipmentDetails } from './views/EquipmentDetails';
import { MessagesPage } from './views/MessagesPage';
import { MaintenanceLog } from './views/MaintenanceLog';
import { BookingConfirmation } from './views/BookingConfirmation';
import { ListEquipmentForm } from './views/ListEquipmentForm';
import { SettingsPage } from './views/SettingsPage';
import { BookingHistory } from './views/index';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useI18n } from './i18n/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { t } = useI18n();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [latestBooking, setLatestBooking] = useState<BookingConfirmationData | null>(null);

  const protectedPages: Page[] = [
    'lister-dashboard',
    'renter-dashboard',
    'history',
    'equipment-details',
    'messages',
    'maintenance',
    'booking-confirmation',
    'list-equipment',
    'settings',
  ];

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { method: 'GET' });
        if (!response.ok) {
          setAuthUser(null);
          return;
        }

        const data = (await response.json()) as { user: AuthUser };
        setAuthUser(data.user);
      } catch {
        setAuthUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    void loadSession();
  }, []);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const handleNavigate = (page: Page) => {
    if (!authUser && protectedPages.includes(page)) {
      setCurrentPage('login');
      return;
    }

    if (authUser && (page === 'login' || page === 'signup')) {
      setCurrentPage('landing');
      return;
    }

    setCurrentPage(page);
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setCurrentPage('landing');
  };

  const handleProfileUpdated = (user: AuthUser) => {
    setAuthUser(user);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors and clear local auth state anyway.
    }

    setAuthUser(null);
    setCurrentPage('login');
  };

  const handleSearchSubmit = () => {
    setCurrentPage('landing');
  };

  const handleOpenEquipmentDetails = (equipmentId: string) => {
    setSelectedEquipmentId(equipmentId);
    handleNavigate('equipment-details');
  };

  const handleBookingCreated = (booking: BookingConfirmationData) => {
    setLatestBooking(booking);
    handleNavigate('booking-confirmation');
  };

  const handleOpenBookingConfirmation = (booking: BookingConfirmationData) => {
    setLatestBooking(booking);
    handleNavigate('booking-confirmation');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return (
          <LandingPage
            onNavigate={handleNavigate}
            onOpenEquipmentDetails={handleOpenEquipmentDetails}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
          />
        );
      case 'login':
        return <LoginPage onNavigate={handleNavigate} onLoginSuccess={handleAuthSuccess} />;
      case 'signup':
        return <SignupPage onNavigate={handleNavigate} onSignupSuccess={handleAuthSuccess} />;
      case 'lister-dashboard':
        return (
          <ListerDashboard
            onNavigate={handleNavigate}
            onOpenEquipmentDetails={handleOpenEquipmentDetails}
          />
        );
      case 'renter-dashboard':
        return <RenterDashboard onNavigate={handleNavigate} />;
      case 'history':
        return (
          <BookingHistory
            onNavigate={handleNavigate}
            onOpenBookingConfirmation={handleOpenBookingConfirmation}
          />
        );
      case 'equipment-details':
        return (
          <EquipmentDetails
            onNavigate={handleNavigate}
            equipmentId={selectedEquipmentId}
            onBookingCreated={handleBookingCreated}
          />
        );
      case 'messages':
        return <MessagesPage onNavigate={handleNavigate} />;
      case 'maintenance':
        return <MaintenanceLog onNavigate={handleNavigate} />;
      case 'booking-confirmation':
        return <BookingConfirmation onNavigate={handleNavigate} booking={latestBooking} />;
      case 'list-equipment':
        return <ListEquipmentForm onNavigate={handleNavigate} />;
      case 'settings':
        return (
          <SettingsPage
            onNavigate={handleNavigate}
            user={authUser}
            onProfileUpdated={handleProfileUpdated}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <LandingPage
            onNavigate={handleNavigate}
            onOpenEquipmentDetails={handleOpenEquipmentDetails}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
          />
        );
    }
  };

  const isAuthPage = currentPage === 'login' || currentPage === 'signup';

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        {t('Checking session...')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-secondary-container selection:text-on-secondary-container">
      {isAuthPage && (
        <div className="fixed top-4 right-4 z-120">
          <LanguageSwitcher className="shadow-lg" />
        </div>
      )}
      {!isAuthPage && (
        <TopBar
          onNavigate={handleNavigate}
          isAuthenticated={Boolean(authUser)}
          authUserId={authUser?.id ?? null}
          onLogout={handleLogout}
          currentPage={currentPage}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
        />
      )}
      {!isAuthPage && <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />}
      
      <main className={`transition-all duration-500 ${!isAuthPage ? 'lg:pl-72 pt-24 pb-32 lg:pb-12 px-6 max-w-screen-2xl mx-auto' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isAuthPage && <BottomBar currentPage={currentPage} onNavigate={handleNavigate} />}
    </div>
  );
}
