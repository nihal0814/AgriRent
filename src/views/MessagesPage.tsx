import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Send,
  Paperclip,
  Tractor,
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { BookingConfirmationData, Page } from '../types';

interface MessagesPageProps {
  onNavigate: (page: Page) => void;
}

type ViewerRole = 'owner' | 'renter';

type ConversationSummary = {
  id: string;
  reservationId: string;
  equipmentName: string;
  startDate: string;
  endDate: string;
  status: BookingConfirmationData['status'];
  createdAt: string;
  viewerRole: ViewerRole;
  counterpartName: string;
  lastMessage: string;
  lastMessageAt: string;
};

type ThreadMessage = {
  id: string;
  senderId: string | null;
  senderName: string;
  text: string;
  createdAt: string;
  isOwnMessage: boolean;
  isSystem: boolean;
};

type ConversationsResponse = {
  conversations?: ConversationSummary[];
  error?: string;
};

type ThreadResponse = {
  messages?: ThreadMessage[];
  error?: string;
};

type SendMessageResponse = {
  message?: ThreadMessage;
  error?: string;
};

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function parseIsoDate(value: string): Date | null {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function formatBookingDate(value: string): string {
  const parsedDate = parseDateInput(value);
  if (!parsedDate) {
    return value;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatConversationTimestamp(value: string): string {
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

function formatMessageTimestamp(value: string): string {
  const parsedDate = parseIsoDate(value);
  if (!parsedDate) {
    return value;
  }

  return parsedDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toConversationStatus(
  status: BookingConfirmationData['status'],
  t: (key: string) => string
): string {
  if (status === 'pending') {
    return t('Pending Approval');
  }

  if (status === 'rejected') {
    return t('Rejected');
  }

  return t('Confirmed');
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [messagesErrorMessage, setMessagesErrorMessage] = useState('');

  useEffect(() => {
    const loadConversations = async () => {
      setIsLoadingConversations(true);
      setErrorMessage('');

      try {
        const response = await fetch('/api/messages');
        const payload = (await response.json().catch(() => null)) as ConversationsResponse | null;

        if (!response.ok) {
          setConversations([]);
          setSelectedConversationId(null);
          setErrorMessage(payload?.error ?? t('Unable to load conversations right now.'));
          return;
        }

        const nextConversations = payload?.conversations ?? [];
        setConversations(nextConversations);
        setSelectedConversationId((currentId) => {
          if (currentId && nextConversations.some((conversation) => conversation.id === currentId)) {
            return currentId;
          }

          return nextConversations[0]?.id ?? null;
        });
      } catch {
        setConversations([]);
        setSelectedConversationId(null);
        setErrorMessage(t('Network error. Please try again.'));
      } finally {
        setIsLoadingConversations(false);
      }
    };

    void loadConversations();
  }, [t]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const counterpartName = conversation.counterpartName.toLowerCase();
      const equipmentName = conversation.equipmentName.toLowerCase();
      const reservationId = conversation.reservationId.toLowerCase();
      return (
        counterpartName.includes(query) ||
        equipmentName.includes(query) ||
        reservationId.includes(query)
      );
    });
  }, [conversations, searchQuery]);

  useEffect(() => {
    if (filteredConversations.length === 0) {
      setSelectedConversationId(null);
      return;
    }

    if (!selectedConversationId || !filteredConversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConversationId]);

  const selectedConversation = useMemo(() => {
    if (selectedConversationId) {
      const exact = conversations.find((conversation) => conversation.id === selectedConversationId);
      if (exact) {
        return exact;
      }
    }

    return conversations[0] ?? null;
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setMessagesErrorMessage('');
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      setMessagesErrorMessage('');

      try {
        const response = await fetch(
          `/api/messages?conversationId=${encodeURIComponent(selectedConversationId)}`
        );
        const payload = (await response.json().catch(() => null)) as ThreadResponse | null;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setMessages([]);
          setMessagesErrorMessage(payload?.error ?? t('Unable to load this conversation right now.'));
          return;
        }

        setMessages(payload?.messages ?? []);
      } catch {
        if (cancelled) {
          return;
        }

        setMessages([]);
        setMessagesErrorMessage(t('Network error. Please try again.'));
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId, t]);

  const handleSendMessage = async () => {
    if (!selectedConversationId || isSendingMessage) {
      return;
    }

    const text = draftMessage.trim();
    if (!text) {
      return;
    }

    setIsSendingMessage(true);
    setMessagesErrorMessage('');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          text,
        }),
      });

      const payload = (await response.json().catch(() => null)) as SendMessageResponse | null;

      if (!response.ok || !payload?.message) {
        setMessagesErrorMessage(payload?.error ?? t('Unable to send message right now.'));
        return;
      }

      setMessages((existing) => {
        const base = existing.length === 1 && existing[0].isSystem ? [] : existing;
        return [...base, payload.message as ThreadMessage];
      });

      setConversations((existing) => {
        const nextConversations = existing.map((conversation) => {
          if (conversation.id !== selectedConversationId) {
            return conversation;
          }

          return {
            ...conversation,
            lastMessage: payload.message?.text ?? conversation.lastMessage,
            lastMessageAt: payload.message?.createdAt ?? conversation.lastMessageAt,
          };
        });

        return [...nextConversations].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
      });

      setDraftMessage('');
    } catch {
      setMessagesErrorMessage(t('Network error. Please try again.'));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  const composerDisabled = !selectedConversation || isLoadingMessages;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row -m-6 overflow-hidden">
      {/* Conversations List */}
      <section className="w-full md:w-80 lg:w-96 bg-surface-container-low flex flex-col h-full border-r border-outline-variant/10">
        <div className="p-6">
          <h1 className="text-3xl font-black text-primary mb-6 tracking-tight">{t('Messages')}</h1>
          <div className="relative mb-6">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              className="w-full bg-surface-container-high border-none rounded-xl pl-10 py-3 text-sm focus:ring-2 focus:ring-secondary/20" 
              placeholder={t('Search conversations...')} 
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 px-3 no-scrollbar pb-4">
          {isLoadingConversations && (
            <div className="px-3 py-2 text-sm font-medium text-on-surface-variant">
              {t('Loading conversations...')}
            </div>
          )}

          {!isLoadingConversations && errorMessage && (
            <div className="px-3 py-2 text-sm font-medium text-on-surface-variant">{errorMessage}</div>
          )}

          {!isLoadingConversations && !errorMessage && filteredConversations.length === 0 && (
            <div className="px-3 py-2 text-sm font-medium text-on-surface-variant">
              {t('No conversations found yet.')}
            </div>
          )}

          {!isLoadingConversations && !errorMessage && filteredConversations.map((conversation) => {
            const isActive = conversation.id === selectedConversation?.id;

            return (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`w-full text-left p-4 rounded-2xl flex gap-4 items-center transition-all ${
                  isActive ? 'bg-surface-container-highest shadow-sm' : 'hover:bg-surface-container-high'
                }`}
              >
                <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-primary/10 text-primary flex items-center justify-center">
                  <Tractor size={22} />
                  {isActive && (
                    <div className="absolute bottom-1 right-1 h-3 w-3 bg-secondary-container rounded-full border-2 border-surface-container-highest"></div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-baseline gap-2">
                    <h3 className="font-bold text-on-surface truncate">{conversation.counterpartName || t('Unknown')}</h3>
                    <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-secondary' : 'text-outline'}`}>
                      {toConversationStatus(conversation.status, t)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-primary truncate">{conversation.equipmentName}</p>
                  <p className="text-xs text-on-surface-variant truncate font-medium">
                    {conversation.lastMessage}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-outline shrink-0 pl-2">
                  {formatConversationTimestamp(conversation.lastMessageAt)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Chat Area */}
      <section className="flex-1 bg-white flex flex-col h-full relative">
        {!selectedConversation && !isLoadingConversations && !errorMessage && (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-on-surface-variant font-medium">
            {t('Select a booking conversation to view details.')}
          </div>
        )}

        {selectedConversation && (
          <>
        {/* Chat Header */}
        <div className="p-4 md:p-6 bg-surface-container-low/50 backdrop-blur-sm border-b border-outline-variant/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
                <Tractor size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">{selectedConversation.equipmentName}</h2>
                <p className="text-sm font-medium text-on-surface-variant">
                  {t('Rental Dates: {start} - {end}', {
                    start: formatBookingDate(selectedConversation.startDate),
                    end: formatBookingDate(selectedConversation.endDate),
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate('history')}
                className="px-4 py-2 text-sm font-bold text-primary bg-surface-container-highest rounded-lg hover:bg-surface-variant transition-colors"
              >
                {t('View Booking')}
              </button>
              <button
                onClick={() =>
                  onNavigate(
                    selectedConversation.viewerRole === 'owner' ? 'lister-dashboard' : 'history'
                  )
                }
                className="px-4 py-2 text-sm font-bold text-white bg-secondary rounded-lg shadow-md transition-all active:scale-95"
              >
                {selectedConversation.viewerRole === 'owner' ? t('Back to Requests') : t('Back to History')}
              </button>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 flex flex-col no-scrollbar">
          {isLoadingMessages && (
            <div className="text-sm font-medium text-on-surface-variant">{t('Loading messages...')}</div>
          )}

          {!isLoadingMessages && messagesErrorMessage && (
            <div className="text-sm font-medium text-red-600">{messagesErrorMessage}</div>
          )}

          {!isLoadingMessages && !messagesErrorMessage && messages.length === 0 && (
            <div className="text-sm font-medium text-on-surface-variant">
              {t('No messages yet. Start the conversation below.')}
            </div>
          )}

          {!isLoadingMessages && !messagesErrorMessage && messages.map((message) => {
            if (message.isSystem) {
              return (
                <div key={message.id} className="flex justify-center">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest bg-surface-container px-3 py-2 rounded-full text-center max-w-[90%]">
                    {message.text}
                  </span>
                </div>
              );
            }

            const isOwnMessage = message.isOwnMessage;
            const senderInitial = message.senderName.slice(0, 1).toUpperCase() || '?';

            return (
              <div
                key={message.id}
                className={`flex gap-4 max-w-[85%] ${isOwnMessage ? 'self-end flex-row-reverse' : ''}`}
              >
                <div
                  className={`h-10 w-10 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold ${
                    isOwnMessage
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-primary text-white'
                  }`}
                >
                  {senderInitial}
                </div>
                <div className={`space-y-1 ${isOwnMessage ? 'items-end flex flex-col' : ''}`}>
                  <span
                    className={`text-xs font-bold text-on-surface-variant ${
                      isOwnMessage ? 'mr-1' : 'ml-1'
                    }`}
                  >
                    {message.senderName}
                  </span>
                  <div
                    className={`${
                      isOwnMessage
                        ? 'bg-primary text-white rounded-2xl rounded-tr-none shadow-lg'
                        : 'bg-surface-container-high text-on-surface rounded-2xl rounded-tl-none shadow-sm'
                    } p-4`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap wrap-break-word">{message.text}</p>
                  </div>
                  <span
                    className={`text-[10px] text-outline ${isOwnMessage ? 'mr-1' : 'ml-1'}`}
                  >
                    {formatMessageTimestamp(message.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Input Area */}
        <div className="p-4 md:p-6 bg-surface-container-low/30 backdrop-blur-md border-t border-outline-variant/10">
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <button
              className="p-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-50"
              disabled
              title={t('Attachment uploads are coming soon.')}
            >
              <Paperclip size={20} />
            </button>
            <div className="flex-1 relative">
              <textarea
                className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-6 pr-12 text-sm focus:ring-2 focus:ring-primary/10 resize-none min-h-14 shadow-inner" 
                placeholder={
                  composerDisabled
                    ? t('Select a conversation to start messaging.')
                    : t('Type your message...')
                }
                rows={2}
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                disabled={composerDisabled || isSendingMessage}
              />
              <button
                className={`absolute right-3 bottom-3 p-2 bg-primary text-white rounded-xl shadow-md transition-all ${
                  composerDisabled || !draftMessage.trim() || isSendingMessage
                    ? 'opacity-60 cursor-not-allowed'
                    : 'active:scale-95'
                }`}
                onClick={() => {
                  void handleSendMessage();
                }}
                disabled={composerDisabled || !draftMessage.trim() || isSendingMessage}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
          </>
        )}
      </section>
    </div>
  );
};
