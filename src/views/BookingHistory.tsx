import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin, RefreshCw, Tractor } from 'lucide-react';

import { useI18n } from '../i18n/LanguageContext';
import { formatINR } from '../lib/currency';
import { BookingConfirmationData, Page } from '../types';

interface BookingHistoryProps {
  onNavigate: (page: Page) => void;
  onOpenBookingConfirmation: (booking: BookingConfirmationData) => void;
}

type BookingsResponse = {
  booking?: BookingConfirmationData | null;
  bookings?: BookingConfirmationData[];
  error?: string;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80';

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

function toStatusLabel(status: BookingConfirmationData['status'], t: (key: string) => string): string {
  if (status === 'pending') {
    return t('Pending Approval');
  }

  if (status === 'rejected') {
    return t('Rejected');
  }

  return t('Confirmed');
}

function toStatusBadgeClasses(status: BookingConfirmationData['status']): string {
  if (status === 'pending') {
    return 'bg-amber-100 text-amber-800';
  }

  if (status === 'rejected') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-secondary-container text-on-secondary-container';
}

export const BookingHistory: React.FC<BookingHistoryProps> = ({
  onNavigate,
  onOpenBookingConfirmation,
}) => {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<BookingConfirmationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadBookings = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/bookings', { method: 'GET' });
      const data = (await response.json()) as BookingsResponse;

      if (!response.ok) {
        setBookings([]);
        setErrorMessage(data.error ?? t('Unable to load booking history right now.'));
        return;
      }

      if (Array.isArray(data.bookings)) {
        setBookings(data.bookings);
        return;
      }

      if (data.booking) {
        setBookings([data.booking]);
        return;
      }

      setBookings([]);
    } catch {
      setBookings([]);
      setErrorMessage(t('Network error. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-primary tracking-tight mb-2">{t('Booking History')}</h1>
          <p className="text-on-surface-variant">
            {t('Track booking requests, approvals, and rental payment totals in one place.')}
          </p>
        </div>
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-all"
        >
          <Tractor size={18} />
          {t('Browse Marketplace')}
        </button>
      </header>

      {isLoading && (
        <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-low p-8 text-center text-on-surface-variant font-medium">
          {t('Loading booking history...')}
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-low p-8 space-y-4">
          <p className="text-on-surface-variant font-medium">{errorMessage}</p>
          <button
            onClick={() => {
              void loadBookings();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-semibold"
          >
            <RefreshCw size={16} />
            {t('Try Again')}
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && bookings.length === 0 && (
        <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-low p-10 text-center space-y-4">
          <h2 className="text-2xl font-black text-primary">{t('No bookings yet.')}</h2>
          <p className="text-on-surface-variant">
            {t('Start by renting equipment from the marketplace and your history will appear here.')}
          </p>
          <button
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold"
          >
            <Tractor size={18} />
            {t('Find Equipment')}
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && bookings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bookings.map((booking) => {
            const imageSrc = booking.imageUrl || FALLBACK_IMAGE;
            const dateLabel = `${formatBookingDate(booking.startDate)} - ${formatBookingDate(booking.endDate)}`;

            return (
              <article
                key={booking.id}
                className="rounded-3xl overflow-hidden border border-outline-variant/10 bg-white shadow-sm"
              >
                <div className="h-52 relative overflow-hidden">
                  <img
                    src={imageSrc}
                    alt={booking.equipmentName}
                    className="w-full h-full object-cover"
                  />
                  <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${toStatusBadgeClasses(booking.status)}`}>
                    {toStatusLabel(booking.status, t)}
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">
                      {t('Reservation ID')}: {booking.reservationId}
                    </p>
                    <h2 className="text-2xl font-black text-on-surface mt-1">{booking.equipmentName}</h2>
                    <p className="text-sm text-on-surface-variant">{booking.category}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <MapPin size={16} className="text-primary" />
                      <span>{booking.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <CalendarDays size={16} className="text-primary" />
                      <span>{dateLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Clock3 size={16} className="text-primary" />
                      <span>{t('{days} days', { days: booking.rentalDays })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Clock3 size={16} className="text-primary" />
                      <span>{t('Booked on {date}', { date: new Date(booking.createdAt).toLocaleDateString() })}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-outline-variant/10 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">
                        {booking.status === 'confirmed' ? t('Total Paid') : t('Quoted Total')}
                      </p>
                      <p className="text-2xl font-black text-primary">{formatINR(booking.total)}</p>
                    </div>
                    <button
                      onClick={() => onOpenBookingConfirmation(booking)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-semibold"
                    >
                      <Clock3 size={16} />
                      {t('View Details')}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};