import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Search, Menu, LogIn, LogOut, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '../i18n/LanguageContext';
import { Page } from '../types';

interface TopBarProps {
  onNavigate: (page: Page) => void;
  isAuthenticated: boolean;
  authUserId?: string | null;
  onLogout: () => void;
  currentPage: Page;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
}

type MessageConversationNotification = {
  id: string;
  counterpartName: string;
  equipmentName: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageIsOwn: boolean;
};

type MessageConversationsResponse = {
  conversations?: MessageConversationNotification[];
  error?: string;
};

const MESSAGE_NOTIFICATIONS_SEEN_AT_KEY = 'agrarian_messages_notifications_seen_at';

function parseIsoDate(value: string): Date | null {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function getLatestConversationTimestamp(conversations: MessageConversationNotification[]): number | null {
  if (conversations.length === 0) {
    return null;
  }

  let latestTimestamp = 0;

  for (const conversation of conversations) {
    const parsedDate = parseIsoDate(conversation.lastMessageAt);
    if (!parsedDate) {
      continue;
    }

    latestTimestamp = Math.max(latestTimestamp, parsedDate.getTime());
  }

  return latestTimestamp > 0 ? latestTimestamp : null;
}

function formatNotificationTimestamp(value: string): string {
  const parsedDate = parseIsoDate(value);
  if (!parsedDate) {
    return value;
  }

  const now = new Date();
  const isToday =
    parsedDate.getFullYear() === now.getFullYear() &&
    parsedDate.getMonth() === now.getMonth() &&
    parsedDate.getDate() === now.getDate();

  if (isToday) {
    return parsedDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export const TopBar: React.FC<TopBarProps> = ({
  onNavigate,
  isAuthenticated,
  authUserId,
  onLogout,
  currentPage,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
}) => {
  const { t } = useI18n();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [messageNotificationsEnabled, setMessageNotificationsEnabled] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState<MessageConversationNotification[]>([]);
  const [notificationLoadError, setNotificationLoadError] = useState('');
  const [messageNotificationsSeenAt, setMessageNotificationsSeenAt] = useState<number | null>(null);

  const unreadMessageNotifications = useMemo(() => {
    const seenAt = messageNotificationsSeenAt ?? 0;

    return messageNotifications
      .filter((conversation) => {
        if (conversation.lastMessageIsOwn) {
          return false;
        }

        const parsedDate = parseIsoDate(conversation.lastMessageAt);
        if (!parsedDate) {
          return false;
        }

        return parsedDate.getTime() > seenAt;
      })
      .sort((first, second) => second.lastMessageAt.localeCompare(first.lastMessageAt));
  }, [messageNotifications, messageNotificationsSeenAt]);

  const markMessagesAsSeen = (conversations: MessageConversationNotification[] = messageNotifications) => {
    if (typeof window === 'undefined') {
      return;
    }

    const latestTimestamp = getLatestConversationTimestamp(conversations) ?? Date.now();
    window.localStorage.setItem(MESSAGE_NOTIFICATIONS_SEEN_AT_KEY, String(latestTimestamp));
    setMessageNotificationsSeenAt(latestTimestamp);
  };

  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsNotificationsOpen(false);
  }, [currentPage]);

  useEffect(() => {
    if (!isAuthenticated || !authUserId || typeof window === 'undefined') {
      setMessageNotificationsEnabled(true);
      return;
    }

    const notificationSettingsRaw = window.localStorage.getItem(
      `agrarian_notification_settings_${authUserId}`
    );

    if (!notificationSettingsRaw) {
      setMessageNotificationsEnabled(true);
      return;
    }

    try {
      const parsed = JSON.parse(notificationSettingsRaw) as {
        messageNotificationsEnabled?: boolean;
      };

      setMessageNotificationsEnabled(parsed.messageNotificationsEnabled ?? true);
    } catch {
      setMessageNotificationsEnabled(true);
    }
  }, [authUserId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') {
      setMessageNotificationsSeenAt(null);
      return;
    }

    const seenAtRaw = window.localStorage.getItem(MESSAGE_NOTIFICATIONS_SEEN_AT_KEY);
    const parsedSeenAt = Number(seenAtRaw ?? '');

    if (Number.isFinite(parsedSeenAt) && parsedSeenAt > 0) {
      setMessageNotificationsSeenAt(parsedSeenAt);
      return;
    }

    setMessageNotificationsSeenAt(null);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !messageNotificationsEnabled) {
      setMessageNotifications([]);
      setNotificationLoadError('');
      return;
    }

    let isCancelled = false;

    const loadMessageNotifications = async () => {
      try {
        const response = await fetch('/api/messages');
        const payload = (await response.json().catch(() => null)) as
          | MessageConversationsResponse
          | null;

        if (isCancelled) {
          return;
        }

        if (!response.ok) {
          setNotificationLoadError(payload?.error ?? t('Unable to load notifications right now.'));
          return;
        }

        const nextConversations = payload?.conversations ?? [];
        setMessageNotifications(nextConversations);
        setNotificationLoadError('');

        if (messageNotificationsSeenAt === null && typeof window !== 'undefined') {
          const latestTimestamp = getLatestConversationTimestamp(nextConversations);
          if (latestTimestamp) {
            window.localStorage.setItem(MESSAGE_NOTIFICATIONS_SEEN_AT_KEY, String(latestTimestamp));
            setMessageNotificationsSeenAt(latestTimestamp);
          }
        }
      } catch {
        if (isCancelled) {
          return;
        }

        setNotificationLoadError(t('Unable to load notifications right now.'));
      }
    };

    void loadMessageNotifications();
    const pollIntervalId = window.setInterval(() => {
      void loadMessageNotifications();
    }, 15000);

    return () => {
      isCancelled = true;
      window.clearInterval(pollIntervalId);
    };
  }, [isAuthenticated, messageNotificationsEnabled, messageNotificationsSeenAt, t]);

  useEffect(() => {
    if (currentPage === 'messages' && unreadMessageNotifications.length > 0) {
      markMessagesAsSeen();
    }
  }, [currentPage, unreadMessageNotifications.length]);

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

          <form onSubmit={handleSearchSubmit} className="hidden md:flex md:ml-5 items-center bg-surface-container-high rounded-full px-4 py-1.5 gap-2 w-full max-w-md">
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

        <div className="flex items-center gap-3">
          <LanguageSwitcher compact className="hidden sm:inline-flex" />
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen((previous) => !previous)}
              className="p-2 text-primary hover:bg-surface-container-high rounded-full transition-colors relative"
            >
              <Bell size={20} />
              {unreadMessageNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-secondary text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadMessageNotifications.length > 9 ? '9+' : unreadMessageNotifications.length}
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 top-12 w-80 max-w-[90vw] rounded-2xl border border-outline-variant/20 bg-white/95 backdrop-blur-md shadow-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-on-surface">{t('Notifications')}</p>
                  {unreadMessageNotifications.length > 0 && (
                    <button
                      onClick={() => markMessagesAsSeen()}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      {t('Mark all as read')}
                    </button>
                  )}
                </div>

                {!isAuthenticated && (
                  <p className="text-xs text-on-surface-variant">{t('Sign in to view notifications.')}</p>
                )}

                {isAuthenticated && !messageNotificationsEnabled && (
                  <p className="text-xs text-on-surface-variant">
                    {t('Message notifications are turned off in settings.')}
                  </p>
                )}

                {isAuthenticated && messageNotificationsEnabled && notificationLoadError && (
                  <p className="text-xs text-red-600">{notificationLoadError}</p>
                )}

                {isAuthenticated &&
                  messageNotificationsEnabled &&
                  !notificationLoadError &&
                  unreadMessageNotifications.length === 0 && (
                    <p className="text-xs text-on-surface-variant">
                      {t('No new notifications right now.')}
                    </p>
                  )}

                {isAuthenticated &&
                  messageNotificationsEnabled &&
                  !notificationLoadError &&
                  unreadMessageNotifications.length > 0 && (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                      {unreadMessageNotifications.slice(0, 6).map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => {
                            onNavigate('messages');
                            setIsNotificationsOpen(false);
                          }}
                          className="w-full text-left rounded-xl border border-outline-variant/10 px-3 py-2 hover:bg-surface-container-low transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold text-on-surface truncate">
                              {conversation.counterpartName}
                            </p>
                            <span className="text-[10px] font-semibold text-outline shrink-0">
                              {formatNotificationTimestamp(conversation.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-primary truncate">
                            {conversation.equipmentName}
                          </p>
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {conversation.lastMessage}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
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
