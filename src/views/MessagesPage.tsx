import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Send,
  Paperclip,
  CheckCheck,
  Tractor,
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { BookingConfirmationData, Page } from '../types';

interface MessagesPageProps {
  onNavigate: (page: Page) => void;
}

type BookingsResponse = {
  bookings?: BookingConfirmationData[];
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

function toConversationStatus(status: BookingConfirmationData['status'], t: (key: string) => string): string {
  if (status === 'pending') {
    return t('Pending Approval');
  }

  if (status === 'rejected') {
    return t('Rejected');
  }

  return t('Confirmed');
}

function toLastMessage(status: BookingConfirmationData['status'], t: (key: string) => string): string {
  if (status === 'pending') {
    return t('Owner: Booking request received and awaiting review.');
  }

  if (status === 'rejected') {
    return t('Owner: Booking request declined. Please review alternate options.');
  }

  return t('Owner: Booking approved. Coordinate pickup details here.');
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<BookingConfirmationData[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadOwnerConversations = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await fetch('/api/bookings?scope=owner');
        const payload = (await response.json().catch(() => null)) as BookingsResponse | null;

        if (!response.ok) {
          setBookings([]);
          setErrorMessage(payload?.error ?? t('Unable to load conversations right now.'));
          return;
        }

        const nextBookings = payload?.bookings ?? [];
        setBookings(nextBookings);
        setSelectedBookingId(nextBookings[0]?.id ?? null);
      } catch {
        setBookings([]);
        setErrorMessage(t('Network error. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    };

    void loadOwnerConversations();
  }, [t]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return bookings;
    }

    return bookings.filter((booking) => {
      const renterName = (booking.renterName ?? '').toLowerCase();
      const equipmentName = booking.equipmentName.toLowerCase();
      const reservationId = booking.reservationId.toLowerCase();
      return (
        renterName.includes(query) ||
        equipmentName.includes(query) ||
        reservationId.includes(query)
      );
    });
  }, [bookings, searchQuery]);

  const selectedBooking = useMemo(() => {
    if (selectedBookingId) {
      const exact = filteredBookings.find((booking) => booking.id === selectedBookingId);
      if (exact) {
        return exact;
      }
    }

    return filteredBookings[0] ?? null;
  }, [filteredBookings, selectedBookingId]);

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
          {isLoading && (
            <div className="px-3 py-2 text-sm font-medium text-on-surface-variant">
              {t('Loading conversations...')}
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="px-3 py-2 text-sm font-medium text-on-surface-variant">{errorMessage}</div>
          )}

          {!isLoading && !errorMessage && filteredBookings.length === 0 && (
            <div className="px-3 py-2 text-sm font-medium text-on-surface-variant">
              {t('No owner conversations found yet.')}
            </div>
          )}

          {!isLoading && !errorMessage && filteredBookings.map((booking) => {
            const isActive = booking.id === selectedBooking?.id;

            return (
              <button
                key={booking.id}
                onClick={() => setSelectedBookingId(booking.id)}
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
                    <h3 className="font-bold text-on-surface truncate">{booking.renterName || t('Unknown')}</h3>
                    <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-secondary' : 'text-outline'}`}>
                      {toConversationStatus(booking.status, t)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-primary truncate">{booking.equipmentName}</p>
                  <p className="text-xs text-on-surface-variant truncate font-medium">
                    {toLastMessage(booking.status, t)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Chat Area */}
      <section className="flex-1 bg-white flex flex-col h-full relative">
        {!selectedBooking && !isLoading && !errorMessage && (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-on-surface-variant font-medium">
            {t('Select a booking conversation to view details.')}
          </div>
        )}

        {selectedBooking && (
          <>
        {/* Chat Header */}
        <div className="p-4 md:p-6 bg-surface-container-low/50 backdrop-blur-sm border-b border-outline-variant/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
                <Tractor size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">{selectedBooking.equipmentName}</h2>
                <p className="text-sm font-medium text-on-surface-variant">
                  {t('Rental Dates: {start} - {end}', {
                    start: formatBookingDate(selectedBooking.startDate),
                    end: formatBookingDate(selectedBooking.endDate),
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
                onClick={() => onNavigate('lister-dashboard')}
                className="px-4 py-2 text-sm font-bold text-white bg-secondary rounded-lg shadow-md transition-all active:scale-95"
              >
                {t('Back to Requests')}
              </button>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 flex flex-col no-scrollbar">
          <div className="flex justify-center">
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest bg-surface-container px-3 py-1 rounded-full">
              {new Date(selectedBooking.createdAt).toLocaleString()}
            </span>
          </div>

          {/* Message: Owner */}
          <div className="flex gap-4 max-w-[85%]">
            <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center text-sm font-bold">
              {t('Ow')}
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-on-surface-variant ml-1">{t('Owner')}</span>
              <div className="bg-surface-container-high p-4 rounded-2xl rounded-tl-none text-on-surface shadow-sm">
                <p className="leading-relaxed">{toLastMessage(selectedBooking.status, t)}</p>
              </div>
              <span className="text-[10px] text-outline ml-1">
                {new Date(selectedBooking.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Message: Me */}
          <div className="flex gap-4 max-w-[85%] self-end flex-row-reverse">
            <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-secondary-container text-on-secondary-container flex items-center justify-center text-sm font-bold">
              {selectedBooking.renterName?.slice(0, 1).toUpperCase() || 'R'}
            </div>
            <div className="space-y-1 items-end flex flex-col">
              <span className="text-xs font-bold text-on-surface-variant mr-1">
                {selectedBooking.renterName || t('Renter')}
              </span>
              <div className="bg-primary text-white p-4 rounded-2xl rounded-tr-none shadow-lg">
                <p className="leading-relaxed">
                  {t('Request details: Reservation {id}, for {days} days, contact {phone}.', {
                    id: selectedBooking.reservationId,
                    days: selectedBooking.rentalDays,
                    phone: selectedBooking.renterPhone || t('Not provided'),
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1 mr-1">
                <span className="text-[10px] text-outline">
                  {new Date(selectedBooking.createdAt).toLocaleTimeString()}
                </span>
                <CheckCheck size={14} className="text-secondary" />
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input Area */}
        <div className="p-4 md:p-6 bg-surface-container-low/30 backdrop-blur-md border-t border-outline-variant/10">
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <button className="p-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors">
              <Paperclip size={20} />
            </button>
            <div className="flex-1 relative">
              <textarea 
                className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-6 pr-12 text-sm focus:ring-2 focus:ring-primary/10 resize-none min-h-[56px] shadow-inner" 
                placeholder={t('Type your message...')} 
                rows={1}
                disabled
              />
              <button className="absolute right-3 bottom-3 p-2 bg-primary text-white rounded-xl shadow-md transition-all opacity-60 cursor-not-allowed" disabled>
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
