import React, { useEffect, useMemo, useState } from 'react';
import { 
  Star, 
  Calendar, 
  ChevronRight,
  Grid
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { formatINR } from '../lib/currency';
import { BookingConfirmationData, Page } from '../types';

interface EquipmentDetailsProps {
  onNavigate: (page: Page) => void;
  equipmentId: string | null;
  onBookingCreated: (booking: BookingConfirmationData) => void;
}

type ApiEquipmentDetails = {
  id: string;
  name: string;
  category: string;
  location: string;
  dailyRate: number;
  brandModel?: string;
  status?: 'available' | 'in-use' | 'maintenance';
  imageUrl?: string | null;
  description?: string | null;
  specs?: {
    horsepower?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
    weight?: string | null;
  } | null;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SERVICE_FEE = 42;
const INSURANCE_FEE = 15;

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

function getRentalDays(startDate: string, endDate: string): number {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  if (!start || !end) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / DAY_IN_MS) + 1;
}

export const EquipmentDetails: React.FC<EquipmentDetailsProps> = ({
  onNavigate,
  equipmentId,
  onBookingCreated,
}) => {
  const { t } = useI18n();
  const [item, setItem] = useState<ApiEquipmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date(Date.now() + DAY_IN_MS)));
  const [endDate, setEndDate] = useState(() => toDateInputValue(new Date(Date.now() + DAY_IN_MS * 2)));
  const todayDate = useMemo(() => toDateInputValue(new Date()), []);

  useEffect(() => {
    const loadEquipmentDetails = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await fetch('/api/equipment');
        if (!response.ok) {
          setErrorMessage(t('Unable to load equipment details.'));
          setItem(null);
          return;
        }

        const data = (await response.json()) as { equipment?: ApiEquipmentDetails[] };
        const listings = data.equipment ?? [];

        const selectedListing = equipmentId
          ? listings.find((listing) => listing.id === equipmentId)
          : listings[0];

        if (!selectedListing) {
          setErrorMessage(t('This listing is no longer available.'));
          setItem(null);
          return;
        }

        setItem(selectedListing);
      } catch {
        setErrorMessage(t('Unable to load equipment details.'));
        setItem(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadEquipmentDetails();
  }, [equipmentId, t]);

  useEffect(() => {
    setBookingError('');
  }, [startDate, endDate]);

  const specs = useMemo(
    () => ({
      horsepower: item?.specs?.horsepower?.trim() || 'N/A',
      fuelType: item?.specs?.fuelType?.trim() || 'N/A',
      transmission: item?.specs?.transmission?.trim() || 'N/A',
      weight: item?.specs?.weight?.trim() || 'N/A',
    }),
    [item]
  );

  if (isLoading) {
    return (
      <div className="pb-24 md:pb-12">
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-8 text-on-surface-variant font-medium">
          {t('Loading equipment details...')}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="pb-24 md:pb-12">
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-8">
          <p className="text-on-surface-variant font-medium mb-4">{errorMessage || t('No equipment details found.')}</p>
          <button
            onClick={() => onNavigate('landing')}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold"
          >
            {t('Back to Marketplace')}
          </button>
        </div>
      </div>
    );
  }

  const displayName = item.brandModel || item.name;
  const imageSrc = item.imageUrl || FALLBACK_IMAGE;
  const rating = 4.8;
  const reviewsCount = 0;
  const rentalDays = getRentalDays(startDate, endDate);
  const hasValidRange = rentalDays > 0;
  const subtotal = item.dailyRate * rentalDays;
  const serviceFee = hasValidRange ? SERVICE_FEE : 0;
  const insuranceFee = hasValidRange ? INSURANCE_FEE : 0;
  const total = subtotal + serviceFee + insuranceFee;

  const handleBookNow = async () => {
    if (!hasValidRange) {
      setBookingError(t('Please choose a valid rental date range.'));
      return;
    }

    setIsBooking(true);
    setBookingError('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          equipmentId: item.id,
          startDate,
          endDate,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; booking?: BookingConfirmationData }
        | null;

      if (!response.ok || !payload?.booking) {
        setBookingError(payload?.error ?? t('Unable to submit booking request right now.'));
        return;
      }

      onBookingCreated(payload.booking);
    } catch {
      setBookingError(t('Unable to submit booking request right now.'));
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="pb-24 md:pb-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 mb-6 text-sm text-on-surface-variant">
        <span onClick={() => onNavigate('landing')} className="hover:text-primary cursor-pointer">{t('Marketplace')}</span>
        <ChevronRight size={14} />
        <span className="hover:text-primary cursor-pointer">{t(item.category || 'Tractors')}</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-on-surface">{displayName}</span>
      </nav>

      {/* Product Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        {/* Gallery Grid */}
        <div className="lg:col-span-8 grid grid-cols-4 grid-rows-2 gap-4 h-[400px] md:h-[600px]">
          <div className="col-span-4 md:col-span-3 row-span-2 relative group overflow-hidden rounded-3xl bg-surface-container-high">
            <img 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              src={imageSrc} 
              alt={displayName} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div className="hidden md:block col-span-1 row-span-1 relative overflow-hidden rounded-3xl bg-surface-container-high">
            <img 
              className="w-full h-full object-cover" 
              src={imageSrc} 
              alt="Detail 1" 
            />
          </div>
          <div className="hidden md:block col-span-1 row-span-1 relative overflow-hidden rounded-3xl bg-surface-container-high">
            <img 
              className="w-full h-full object-cover" 
              src={imageSrc} 
              alt="Detail 2" 
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold cursor-pointer">
              <span className="flex flex-col items-center">
                <Grid size={24} />
                <span className="text-[10px] uppercase tracking-widest mt-1">{t('+12 Photos')}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-outline-variant/10 sticky top-24">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-secondary font-bold text-[10px] uppercase tracking-widest block mb-1">{t('Elite Tier')}</span>
                <h1 className="text-3xl font-black text-on-surface tracking-tight leading-none mb-2">{displayName}</h1>
                <div className="flex items-center gap-1 text-on-surface-variant text-sm">
                  <Star size={14} className="text-secondary" fill="currentColor" />
                  <span className="font-bold text-on-surface">{rating}</span>
                  <span>({reviewsCount} {t('Reviews')})</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-primary tracking-tighter">{formatINR(item.dailyRate)}</div>
                <div className="text-[10px] text-on-surface-variant font-medium uppercase">{t('per day')}</div>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('Select Rental Period')}</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-container-low p-3 rounded-xl border-b-2 border-secondary">
                  <label htmlFor="start-date" className="block text-[10px] text-on-surface-variant/70 uppercase font-bold">{t('Start Date')}</label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    min={todayDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                  />
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl border-b-2 border-outline-variant/30">
                  <label htmlFor="end-date" className="block text-[10px] text-on-surface-variant/70 uppercase font-bold">{t('End Date')}</label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    min={startDate || todayDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                  />
                </div>
              </div>
              {!hasValidRange && (
                <p className="text-xs font-medium text-red-600">{t('Please choose a valid rental date range.')}</p>
              )}
            </div>

            <div className="space-y-3 mb-8 py-4 border-y border-outline-variant/20">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">
                  {formatINR(item.dailyRate)} {t('x {days} days', { days: rentalDays })}
                </span>
                <span className="font-medium">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('Service Fee')}</span>
                <span className="font-medium">{formatINR(serviceFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('Insurance (Mandatory)')}</span>
                <span className="font-medium">{formatINR(insuranceFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-black pt-2 border-t border-dashed border-outline-variant/30">
                <span>{t('Total')}</span>
                <span className="text-primary">{formatINR(total)}</span>
              </div>
            </div>

            <button 
              onClick={handleBookNow}
              disabled={!hasValidRange || isBooking}
              className="w-full bg-gradient-to-br from-secondary to-secondary-container text-on-secondary-container font-black py-4 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Calendar size={18} />
              {isBooking ? t('Sending Request...') : t('Request Booking')}
            </button>
            {bookingError && (
              <p className="mt-3 text-sm font-medium text-red-600">{bookingError}</p>
            )}
          </div>
        </div>
      </section>

      {/* Details & Specs */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <div className="mb-12">
            <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
              <span className="w-8 h-1 bg-primary rounded-full"></span>
              {t('Equipment Overview')}
            </h2>
            <p className="text-on-surface-variant leading-relaxed text-lg mb-6">
              {item.description?.trim() || t('Well-maintained equipment ready for your next field operation.')}
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-black mb-6">{t('Technical Specifications')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                <span className="block text-[10px] text-on-surface-variant uppercase font-extrabold tracking-widest mb-2">{t('Horsepower')}</span>
                <span className="text-lg font-black text-on-surface">{specs.horsepower}</span>
              </div>
              <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                <span className="block text-[10px] text-on-surface-variant uppercase font-extrabold tracking-widest mb-2">{t('Fuel Type')}</span>
                <span className="text-lg font-black text-on-surface">{t(specs.fuelType)}</span>
              </div>
              <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                <span className="block text-[10px] text-on-surface-variant uppercase font-extrabold tracking-widest mb-2">{t('Transmission')}</span>
                <span className="text-lg font-black text-on-surface">{specs.transmission}</span>
              </div>
              <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                <span className="block text-[10px] text-on-surface-variant uppercase font-extrabold tracking-widest mb-2">{t('Weight')}</span>
                <span className="text-lg font-black text-on-surface">{specs.weight}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
