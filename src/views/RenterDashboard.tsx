import React, { useEffect, useMemo, useState } from 'react';
import {
  Map,
  TrendingUp,
  ChevronRight,
  MoreVertical,
  Plus,
  Tractor,
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { formatINR } from '../lib/currency';
import { BookingConfirmationData, Page } from '../types';

interface RenterDashboardProps {
  onNavigate: (page: Page) => void;
}

type ApiEquipment = {
  id: string;
  name: string;
  category: string;
  location: string;
  dailyRate: number;
  brandModel?: string;
  status?: 'available' | 'in-use' | 'maintenance';
  imageUrl?: string | null;
  createdAt?: string | null;
};

type BookingsResponse = {
  bookings?: BookingConfirmationData[];
  error?: string;
};

type EquipmentResponse = {
  equipment?: ApiEquipment[];
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

function toStatusBadge(status: BookingConfirmationData['status']): string {
  if (status === 'pending') {
    return 'bg-amber-100 text-amber-800';
  }

  if (status === 'rejected') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-emerald-100 text-primary';
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

export const RenterDashboard: React.FC<RenterDashboardProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<BookingConfirmationData[]>([]);
  const [equipment, setEquipment] = useState<ApiEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadOwnerData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [bookingsResponse, equipmentResponse] = await Promise.all([
          fetch('/api/bookings?scope=owner'),
          fetch('/api/equipment?scope=mine'),
        ]);

        const bookingsPayload = (await bookingsResponse.json().catch(() => null)) as
          | BookingsResponse
          | null;
        const equipmentPayload = (await equipmentResponse.json().catch(() => null)) as
          | EquipmentResponse
          | null;

        if (!bookingsResponse.ok || !equipmentResponse.ok) {
          setBookings([]);
          setEquipment([]);
          setErrorMessage(
            bookingsPayload?.error ??
              equipmentPayload?.error ??
              t('Unable to load owner dashboard data right now.')
          );
          return;
        }

        setBookings(bookingsPayload?.bookings ?? []);
        setEquipment(equipmentPayload?.equipment ?? []);
      } catch {
        setBookings([]);
        setEquipment([]);
        setErrorMessage(t('Network error. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    };

    void loadOwnerData();
  }, [t]);

  const metrics = useMemo(() => {
    const confirmed = bookings.filter((booking) => booking.status === 'confirmed');
    const pending = bookings.filter((booking) => booking.status === 'pending');
    const rejected = bookings.filter((booking) => booking.status === 'rejected');
    const projectedRevenue = confirmed.reduce((sum, booking) => sum + booking.total, 0);
    const maintenanceUnits = equipment.filter((item) => item.status === 'maintenance').length;
    const utilization =
      equipment.length === 0 ? 0 : Math.round(((equipment.length - maintenanceUnits) / equipment.length) * 100);

    return {
      confirmedCount: confirmed.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      projectedRevenue,
      utilization,
    };
  }, [bookings, equipment]);

  const activeThisWeek = useMemo(() => {
    return bookings
      .filter((booking) => booking.status === 'confirmed')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);
  }, [bookings]);

  return (
    <div className="space-y-10">
      {/* Hero Summary */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 bg-surface-container-low rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden border border-outline-variant/10">
          <div className="relative z-10">
            <h1 className="text-4xl lg:text-5xl font-black text-primary mb-4 tracking-tight leading-none">
              {t('Welcome back,')}
              <br />
              {t('Owner Dashboard')}
            </h1>
            <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed">
              {t(
                'You have {confirmedCount} confirmed rentals, {pendingCount} pending requests, and {rejectedCount} rejected requests.',
                {
                  confirmedCount: metrics.confirmedCount,
                  pendingCount: metrics.pendingCount,
                  rejectedCount: metrics.rejectedCount,
                }
              )}
            </p>
          </div>
          <div className="mt-8 flex gap-4 z-10">
            <button
              className="bg-secondary-container text-on-secondary-container px-6 py-3 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all shadow-md"
              onClick={() => onNavigate('lister-dashboard')}
            >
              <Map size={18} />
              {t('Review Requests')}
            </button>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-20 pointer-events-none">
            <img 
              className="h-full w-full object-cover rounded-l-full" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVS3h9m-aIMfv1UyC4C87INpvtg2GdH61vS0wYDiBxDS9pbAslIYlgKWsTNXe9fAKHQZVdmHeJZoigAYfzJK4d8h_oLgPjzYTzmGeoUVSzHVWcdkoFNDBBzENXWr5V7h6jLEMCu-CKV48x0VDvDqwR22qeGyVL3gwR7bP_63NO3JJdVK8YjIiEr2-RKXQ-gZDQy8eg91KcPTqBWsZOFpCRcAbqRa-5u4TPPrC1L6Yu2rLRNz_uWMNgm5TdiEMfk6I-WLUoGH5aV-o" 
              alt="Texture" 
            />
          </div>
        </div>

        <div className="md:col-span-4 bg-primary text-white rounded-3xl p-8 flex flex-col justify-between shadow-xl">
          <div>
            <span className="bg-primary-container text-on-primary-container text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">{t('Owner Revenue Snapshot')}</span>
            <div className="mt-6">
              <span className="text-5xl font-black">{formatINR(metrics.projectedRevenue)}</span>
              <p className="text-on-primary-container mt-2 text-sm">
                {t('Confirmed booking revenue captured from your current owner account.')}
              </p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-primary-container/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary-container rounded-lg">
                <TrendingUp size={16} className="text-on-secondary-container" />
              </div>
              <span className="text-sm font-medium">
                {t('Fleet utilization: {value}%', { value: metrics.utilization })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Active This Week */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-on-surface">{t('Recently Confirmed Rentals')}</h2>
            <p className="text-on-surface-variant">{t('Latest owner bookings from your current listings.')}</p>
          </div>
          <button
            className="text-primary font-bold flex items-center gap-1 hover:underline"
            onClick={() => onNavigate('history')}
          >
            {t('View Full History')} <ChevronRight size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 text-on-surface-variant font-medium">
            {t('Loading owner rentals...')}
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 text-on-surface-variant font-medium">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeThisWeek.map((booking) => (
              <div key={booking.id} className="bg-white rounded-3xl overflow-hidden group transition-all duration-300 hover:shadow-lg border border-outline-variant/10">
                <div className="h-48 relative overflow-hidden">
                  <img
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={booking.imageUrl || FALLBACK_IMAGE}
                    alt={booking.equipmentName}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-secondary-container text-on-secondary-container text-[10px] font-black px-2 py-1 rounded tracking-tighter uppercase">
                      {t('Confirmed')}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-on-surface">{booking.equipmentName}</h3>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {t('Renter')}: {booking.renterName || t('Unknown')}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-outline">{t('Return Date')}</span>
                      <span className="font-bold text-on-surface">{formatBookingDate(booking.endDate)}</span>
                    </div>
                    <button className="text-on-surface bg-surface-container-low p-2 rounded-xl active:scale-90 transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div
              onClick={() => onNavigate('list-equipment')}
              className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-3xl p-6 flex flex-col justify-center items-center text-center group cursor-pointer hover:border-primary transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:bg-primary-container group-hover:text-white transition-all">
                <Plus size={32} />
              </div>
              <h3 className="text-lg font-bold text-on-surface">{t('List More Equipment')}</h3>
              <p className="text-sm text-on-surface-variant mt-1 px-4">
                {t('Publish additional units so renters can discover and book them faster.')}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Booking History */}
      <section>
        <h2 className="text-2xl font-black text-on-surface mb-6">{t('Booking History')}</h2>
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-outline-variant/10">
          {isLoading && (
            <div className="p-6 text-on-surface-variant font-medium">{t('Loading booking history...')}</div>
          )}

          {!isLoading && !errorMessage && bookings.length === 0 && (
            <div className="p-6 text-on-surface-variant font-medium">{t('No owner bookings yet.')}</div>
          )}

          {!isLoading && !errorMessage && bookings.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-outline tracking-widest">{t('Equipment')}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-outline tracking-widest">{t('Date Range')}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-outline tracking-widest">{t('Status')}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-outline tracking-widest text-right">{t('Total Cost')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 overflow-hidden flex items-center justify-center">
                          <Tractor size={20} className="text-primary" />
                        </div>
                        <span className="font-bold text-on-surface">{booking.equipmentName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-on-surface-variant font-medium">
                      {formatBookingDate(booking.startDate)} - {formatBookingDate(booking.endDate)}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${toStatusBadge(booking.status)}`}>
                        {toStatusLabel(booking.status, t)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-primary">{formatINR(booking.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
