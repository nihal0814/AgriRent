import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Clock3,
  MapPin, 
  MessageCircle, 
  ExternalLink, 
  Download,
  Check,
  XCircle
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { formatINR } from '../lib/currency';
import { BookingConfirmationData, Page } from '../types';

interface BookingConfirmationProps {
  onNavigate: (page: Page) => void;
  booking: BookingConfirmationData | null;
}

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

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ onNavigate, booking }) => {
  const { t } = useI18n();

  const [resolvedBooking, setResolvedBooking] = useState<BookingConfirmationData | null>(booking);
  const [isBookingLoading, setIsBookingLoading] = useState(!booking);

  useEffect(() => {
    if (booking) {
      setResolvedBooking(booking);
      setIsBookingLoading(false);
      return;
    }

    let isMounted = true;

    const loadLatestBooking = async () => {
      setIsBookingLoading(true);

      try {
        const response = await fetch('/api/bookings', { method: 'GET' });
        if (!response.ok) {
          if (isMounted) {
            setResolvedBooking(null);
          }
          return;
        }

        const data = (await response.json()) as { booking?: BookingConfirmationData | null };

        if (isMounted) {
          setResolvedBooking(data.booking ?? null);
        }
      } catch {
        if (isMounted) {
          setResolvedBooking(null);
        }
      } finally {
        if (isMounted) {
          setIsBookingLoading(false);
        }
      }
    };

    void loadLatestBooking();

    return () => {
      isMounted = false;
    };
  }, [booking]);

  if (isBookingLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/20 text-center text-on-surface-variant font-medium">
          {t('Loading booking confirmation...')}
        </div>
      </div>
    );
  }

  if (!resolvedBooking) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/20 text-center">
          <h1 className="text-3xl font-black text-primary mb-4">{t('No booking to confirm yet.')}</h1>
          <p className="text-on-surface-variant mb-6">
            {t('Complete a booking from equipment details and your confirmation will appear here.')}
          </p>
          <button
            onClick={() => onNavigate('landing')}
            className="px-6 py-3 rounded-xl bg-primary text-white font-bold"
          >
            {t('Browse Marketplace')}
          </button>
        </div>
      </div>
    );
  }

  const imageSrc = resolvedBooking.imageUrl || FALLBACK_IMAGE;
  const startDateLabel = formatBookingDate(resolvedBooking.startDate);
  const endDateLabel = formatBookingDate(resolvedBooking.endDate);
  const dateRangeLabel = `${startDateLabel} - ${endDateLabel}`;
  const isPending = resolvedBooking.status === 'pending';
  const isRejected = resolvedBooking.status === 'rejected';
  const isConfirmed = !isPending && !isRejected;

  const headerTitle = isPending
    ? t('Booking Request Sent')
    : isRejected
    ? t('Booking Request Declined')
    : t('Booking Confirmed!');

  const headerSubtitle = isPending
    ? t('Waiting for owner approval. Reservation ID: {id}', { id: resolvedBooking.reservationId })
    : isRejected
    ? t('This request was not approved. Reservation ID: {id}', { id: resolvedBooking.reservationId })
    : t('Reservation ID: {id}', { id: resolvedBooking.reservationId });

  const summaryDescription = isPending
    ? t('Your request is queued for owner review. We will notify you once it is approved.')
    : isRejected
    ? t('This request was declined by the owner. You can explore other available equipment.')
    : t('Your booking is confirmed and locked for the selected rental period.');

  const checklistTitle = isConfirmed ? t('Pre-Pickup Checklist') : t('Next Steps');
  const checklistItems = isConfirmed
    ? [
        { title: t('Check fluid levels'), desc: t('Ensure diesel and hydraulic fluid are at optimal levels upon pickup.'), checked: true },
        { title: t('Confirm pickup time'), desc: t('Send a message to the owner 2 hours before arrival.') },
        { title: t('Review safety manual'), desc: t('Download and review the operating guide before pickup.') },
      ]
    : isPending
    ? [
        { title: t('Owner review in progress'), desc: t('The owner can approve or reject your booking request from their dashboard.') },
        { title: t('Keep your dates available'), desc: t('Approved requests are reserved for the selected rental dates immediately.') },
        { title: t('Check messages for updates'), desc: t('Use the message thread if the owner needs additional details.') },
      ]
    : [
        { title: t('Explore other listings'), desc: t('Browse alternatives and submit a new booking request quickly.') },
        { title: t('Contact the owner for context'), desc: t('Ask why this request was declined before submitting again.') },
        { title: t('Adjust your rental dates'), desc: t('Trying a different time window can improve approval chances.') },
      ];

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Success Header */}
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${
            isPending
              ? 'bg-amber-100'
              : isRejected
              ? 'bg-rose-100'
              : 'bg-secondary-container'
          }`}
        >
          {isPending && <Clock3 size={44} className="text-amber-700" />}
          {isRejected && <XCircle size={44} className="text-rose-700" />}
          {isConfirmed && (
            <CheckCircle2 size={48} className="text-on-secondary-container" fill="currentColor" />
          )}
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-primary tracking-tight mb-2">{headerTitle}</h1>
        <p className="text-on-surface-variant text-lg">{headerSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Equipment Card */}
          <div className="bg-surface-container-highest rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row h-auto md:h-80 border border-outline-variant/10">
            <div className="md:w-1/2 relative h-64 md:h-full">
              <img 
                className="absolute inset-0 w-full h-full object-cover" 
                src={imageSrc} 
                alt={resolvedBooking.equipmentName} 
              />
              <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-lg">{t('Verified Equipment')}</div>
            </div>
            <div className="p-8 md:w-1/2 flex flex-col justify-center">
              <h2 className="text-3xl font-black text-on-surface mb-2">{resolvedBooking.equipmentName}</h2>
              <p className="text-on-surface-variant mb-6 leading-relaxed">{summaryDescription}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-outline">{t('Dates')}</span>
                  <p className="font-bold text-primary">{dateRangeLabel}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-outline">
                    {isConfirmed ? t('Total Paid') : t('Quoted Total')}
                  </span>
                  <p className="font-bold text-primary">{formatINR(resolvedBooking.total)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pickup & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MapPin size={20} className="text-secondary" />
                {t('Pickup Details')}
              </h3>
              <p className="font-bold text-on-surface">{resolvedBooking.location}</p>
              <p className="text-on-surface-variant mb-4">{t('Bring a valid ID and arrive within your selected rental window.')}</p>
              <div className="w-full h-32 bg-surface-container-highest rounded-2xl overflow-hidden grayscale opacity-80 hover:grayscale-0 transition-all">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWly_dSLzEgfVRCwK05_Cb00Qb8e93QcuU2m2IRtwWpRHsWR2V0FVto2jU8v56mxFd6tphk-M8AUuaMr4ezIHyaStwQCLKfYBBz_wVeeFf9g9t2TTRRxiEMb15Nrk7FxaPdfWncdY_Z_i2AMJGshGn26-DV4ziTiAWe-BezZC4oxqLMQgcRhA816XQgYD50TlJs4zEqLipqk0eDX4KDSq_BNfLb4Voc8jaxs8GFguxi4TMIh2DqkiZmCAHXo5ChrqeXHwJrc2-u2U" alt="Map" />
              </div>
            </div>

            <div className="bg-surface-container-low p-8 rounded-3xl flex flex-col justify-between border border-outline-variant/10">
              <div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <MessageCircle size={20} className="text-secondary" />
                  {t('Contact Owner')}
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">SM</div>
                  <div>
                    <p className="font-bold">{t('Owner Contact')}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold">{t('Response time: < 2 hours')}</p>
                  </div>
                </div>
                <p className="text-sm italic text-on-surface-variant mb-6">
                  "
                  {isPending
                    ? t('Your booking request is pending owner approval. Use messages if you need to share context.')
                    : isRejected
                    ? t('This booking request was declined. Reach out to the owner for clarification if needed.')
                    : t('Your booking is confirmed. Use messages to coordinate pickup details with the owner.')}
                  "
                </p>
              </div>
              <button 
                onClick={() => onNavigate('messages')}
                className="inline-flex items-center justify-center gap-2 bg-surface-container-highest py-3 rounded-xl font-bold text-primary hover:bg-surface-container transition-colors"
              >
                <ExternalLink size={16} />
                {t('View Message Thread')}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-primary text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <h3 className="text-2xl font-black mb-8 relative z-10">{checklistTitle}</h3>
            <ul className="space-y-6 relative z-10">
              {checklistItems.map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className={`mt-1 w-6 h-6 border-2 rounded flex items-center justify-center ${item.checked ? 'border-primary-container bg-primary-container/30' : 'border-white/20'}`}>
                    {item.checked && <Check size={14} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{item.title}</p>
                    <p className="text-[10px] text-on-primary-container/80 mt-1">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button className="mt-10 w-full bg-secondary-container text-on-secondary-container py-4 rounded-xl font-black tracking-tight hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg">
              <Download size={18} />
              {t('Get Rental Packet (PDF)')}
            </button>
          </div>

          <div className="bg-surface-container-high p-8 rounded-3xl border border-outline-variant/10">
            <h3 className="text-lg font-bold mb-6 border-b border-outline-variant/20 pb-2">{t('Receipt Summary')}</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('Rental Rate ({rate} x {days} days)', { rate: formatINR(resolvedBooking.dailyRate), days: resolvedBooking.rentalDays })}</span>
                <span className="font-bold">{formatINR(resolvedBooking.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('Service Fee')}</span>
                <span className="font-bold">{formatINR(resolvedBooking.serviceFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('Insurance Coverage')}</span>
                <span className="font-bold">{formatINR(resolvedBooking.insuranceFee)}</span>
              </div>
              <div className="pt-4 border-t border-outline-variant/20 flex justify-between items-end">
                <span className="font-bold text-xl">{t('Total')}</span>
                <span className="font-black text-2xl text-secondary">{formatINR(resolvedBooking.total)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer Nav */}
      <footer className="mt-20 pt-12 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col gap-2 text-center md:text-left">
          <p className="text-2xl font-black text-primary tracking-tighter">AgriRent</p>
          <p className="text-sm text-on-surface-variant">{t('Fueling the next generation of modern agriculture.')}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => onNavigate('landing')} className="px-8 py-3 bg-surface-container-highest text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors">
            {t('Marketplace')}
          </button>
          <button onClick={() => onNavigate('renter-dashboard')} className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-xl hover:-translate-y-0.5 transition-all">
            {t('My Rentals')}
          </button>
        </div>
      </footer>
    </div>
  );
};
