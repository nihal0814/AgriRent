import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Plus, 
  ArrowRight,
  Tractor,
  Trash2,
  X
} from 'lucide-react';
import { formatINR } from '../lib/currency';
import { useI18n } from '../i18n/LanguageContext';
import { BookingConfirmationData, Page } from '../types';

interface ListerDashboardProps {
  onNavigate: (page: Page) => void;
  onOpenEquipmentDetails: (equipmentId: string) => void;
}

type EquipmentStatus = 'available' | 'in-use' | 'maintenance';

type ApiEquipment = {
  id: string;
  name: string;
  category: string;
  location: string;
  dailyRate: number;
  brandModel?: string;
  status?: EquipmentStatus;
  imageUrl?: string | null;
  createdAt?: string | null;
};

type BookingsResponse = {
  booking?: BookingConfirmationData | null;
  bookings?: BookingConfirmationData[];
  error?: string;
};

type BookingActionResponse = {
  booking?: BookingConfirmationData;
  error?: string;
};

type DeleteListingResponse = {
  deleted?: boolean;
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

export const ListerDashboard: React.FC<ListerDashboardProps> = ({ onNavigate, onOpenEquipmentDetails }) => {
  const { t } = useI18n();
  const [equipment, setEquipment] = useState<ApiEquipment[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);
  const [equipmentErrorMessage, setEquipmentErrorMessage] = useState('');
  const [equipmentSuccessMessage, setEquipmentSuccessMessage] = useState('');
  const [isDeletingEquipmentId, setIsDeletingEquipmentId] = useState<string | null>(null);
  const [listingToDelete, setListingToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteDialogErrorMessage, setDeleteDialogErrorMessage] = useState('');
  const [pendingRequests, setPendingRequests] = useState<BookingConfirmationData[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestErrorMessage, setRequestErrorMessage] = useState('');
  const [isUpdatingRequestId, setIsUpdatingRequestId] = useState<string | null>(null);

  const loadEquipment = useCallback(async () => {
    setIsLoadingEquipment(true);
    setEquipmentErrorMessage('');

    try {
      const response = await fetch('/api/equipment?scope=mine');
      const data = (await response.json().catch(() => null)) as
        | { equipment?: ApiEquipment[]; error?: string }
        | null;

      if (!response.ok) {
        setEquipment([]);
        setEquipmentErrorMessage(data?.error ?? t('Unable to load your listings right now.'));
        return;
      }

      setEquipment(data?.equipment ?? []);
    } catch {
      setEquipment([]);
      setEquipmentErrorMessage(t('Network error. Please try again.'));
    } finally {
      setIsLoadingEquipment(false);
    }
  }, [t]);

  useEffect(() => {
    void loadEquipment();
  }, [loadEquipment]);

  const loadPendingRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    setRequestErrorMessage('');

    try {
      const response = await fetch('/api/bookings?scope=owner&status=pending');
      const data = (await response.json()) as BookingsResponse;

      if (!response.ok) {
        setPendingRequests([]);
        setRequestErrorMessage(data.error ?? t('Unable to load pending booking requests right now.'));
        return;
      }

      setPendingRequests(data.bookings ?? []);
    } catch {
      setPendingRequests([]);
      setRequestErrorMessage(t('Network error. Please try again.'));
    } finally {
      setIsLoadingRequests(false);
    }
  }, [t]);

  useEffect(() => {
    void loadPendingRequests();
  }, [loadPendingRequests]);

  const handleBookingAction = async (bookingId: string, action: 'approve' | 'reject') => {
    setIsUpdatingRequestId(bookingId);
    setRequestErrorMessage('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          action,
        }),
      });

      const payload = (await response.json().catch(() => null)) as BookingActionResponse | null;

      if (!response.ok) {
        setRequestErrorMessage(payload?.error ?? t('Unable to update booking request right now.'));
        return;
      }

      setPendingRequests((previous) => previous.filter((request) => request.id !== bookingId));
    } catch {
      setRequestErrorMessage(t('Network error. Please try again.'));
    } finally {
      setIsUpdatingRequestId(null);
    }
  };

  const openDeleteDialog = (equipmentId: string, equipmentName: string) => {
    setListingToDelete({ id: equipmentId, name: equipmentName });
    setDeleteConfirmationText('');
    setDeleteDialogErrorMessage('');
    setEquipmentErrorMessage('');
    setEquipmentSuccessMessage('');
  };

  const closeDeleteDialog = () => {
    if (isDeletingEquipmentId) {
      return;
    }

    setListingToDelete(null);
    setDeleteConfirmationText('');
    setDeleteDialogErrorMessage('');
  };

  const handleDeleteListing = async () => {
    if (!listingToDelete) {
      return;
    }

    if (deleteConfirmationText.trim() !== 'DELETE') {
      setDeleteDialogErrorMessage(t('Type DELETE to confirm listing removal.'));
      return;
    }

    const equipmentId = listingToDelete.id;

    setIsDeletingEquipmentId(equipmentId);
    setDeleteDialogErrorMessage('');
    setEquipmentErrorMessage('');
    setEquipmentSuccessMessage('');

    try {
      const response = await fetch(`/api/equipment?id=${encodeURIComponent(equipmentId)}`, {
        method: 'DELETE',
      });
      const payload = (await response.json().catch(() => null)) as DeleteListingResponse | null;

      if (!response.ok) {
        setDeleteDialogErrorMessage(payload?.error ?? t('Unable to delete listing right now.'));
        return;
      }

      setEquipment((previous) => previous.filter((item) => item.id !== equipmentId));
      setEquipmentSuccessMessage(t('Listing deleted successfully.'));
      closeDeleteDialog();
    } catch {
      setDeleteDialogErrorMessage(t('Network error. Please try again.'));
    } finally {
      setIsDeletingEquipmentId(null);
    }
  };

  const statusCounts = useMemo(() => {
    return equipment.reduce(
      (counts, item) => {
        const status = item.status ?? 'available';
        if (status === 'in-use') {
          counts.inUse += 1;
        } else if (status === 'maintenance') {
          counts.maintenance += 1;
        } else {
          counts.available += 1;
        }
        counts.totalDailyRate += item.dailyRate ?? 0;
        return counts;
      },
      { inUse: 0, maintenance: 0, available: 0, totalDailyRate: 0 }
    );
  }, [equipment]);

  const toBadgeClasses = (status: EquipmentStatus) => {
    if (status === 'in-use') {
      return 'bg-green-100 text-green-800';
    }

    if (status === 'maintenance') {
      return 'bg-amber-100 text-amber-800';
    }

    return 'bg-zinc-100 text-zinc-600';
  };

  const toStatusLabel = (status: EquipmentStatus) => {
    if (status === 'in-use') {
      return t('In Use');
    }

    if (status === 'maintenance') {
      return t('Maintenance');
    }

    return t('Available');
  };

  const toSubtitle = (status: EquipmentStatus) => {
    if (status === 'in-use') {
      return t('Currently rented');
    }

    if (status === 'maintenance') {
      return t('Under maintenance');
    }

    return t('Ready to be booked');
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight mb-2">{t('Lister Dashboard')}</h1>
          <p className="text-on-surface-variant font-medium">{t('Manage your fleet and track seasonal performance.')}</p>
        </div>
        <button 
          onClick={() => onNavigate('list-equipment')}
          className="inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <Plus size={20} />
          {t('New Listing')}
        </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Earnings Summary */}
        <section className="md:col-span-8 bg-surface-container-low rounded-3xl p-8 flex flex-col justify-between overflow-hidden border border-outline-variant/10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-xl font-bold text-primary mb-1">{t('Seasonal Earnings')}</h2>
              <p className="text-sm text-on-surface-variant">{t('Net revenue across all active units')}</p>
            </div>
            <div className="flex gap-2 bg-surface-container-high p-1 rounded-xl">
              <button className="px-4 py-1.5 text-xs font-bold bg-white rounded-lg shadow-sm text-primary">{t('Weekly')}</button>
              <button className="px-4 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-white/50 transition-colors rounded-lg">{t('Monthly')}</button>
            </div>
          </div>
          
          {/* Chart Placeholder */}
          <div className="relative h-64 w-full flex items-end gap-2 px-2">
            {[40, 65, 55, 85, 45, 95, 70].map((height, i) => (
              <div 
                key={i}
                className={`flex-1 rounded-t-xl transition-all hover:bg-secondary-container ${i === 5 ? 'bg-primary' : 'bg-surface-container-highest'}`}
                style={{ height: `${height}%` }}
              >
                {i === 5 && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] py-1 px-2 rounded shadow-md">₹4,280</div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-outline-variant/10">
            <div>
              <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">{t('Total Payout')}</span>
              <span className="text-2xl font-black text-primary">{formatINR(statusCounts.totalDailyRate)}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">{t('Active Hours')}</span>
              <span className="text-2xl font-black text-primary">342h</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">{t('Utilization')}</span>
              <span className="text-2xl font-black text-secondary">82%</span>
            </div>
          </div>
        </section>

        {/* Status Summaries */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-highest p-6 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <h3 className="font-bold text-primary mb-1">{t('Active Rentals')}</h3>
              <p className="text-3xl font-black">{String(statusCounts.inUse).padStart(2, '0')}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Tractor size={24} />
            </div>
          </div>

          <div className="bg-secondary-container p-6 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <h3 className="font-bold text-on-secondary-container mb-1">{t('Pending Requests')}</h3>
              <p className="text-3xl font-black text-on-secondary-container">{String(pendingRequests.length).padStart(2, '0')}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-on-secondary-container/10 flex items-center justify-center text-on-secondary-container">
              <Users size={24} />
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-3xl flex items-center justify-between border border-outline-variant/20 shadow-sm">
            <div>
              <h3 className="font-bold text-on-surface mb-1">{t('Upcoming')}</h3>
              <p className="text-3xl font-black">{String(statusCounts.available).padStart(2, '0')}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <Calendar size={24} />
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-black text-primary">{t('Incoming Booking Requests')}</h2>
          <button
            onClick={() => {
              void loadPendingRequests();
            }}
            className="text-sm font-bold text-primary hover:underline"
            disabled={isLoadingRequests}
          >
            {isLoadingRequests ? t('Refreshing...') : t('Refresh')}
          </button>
        </div>

        {isLoadingRequests && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 text-on-surface-variant text-sm font-medium">
            {t('Loading pending requests...')}
          </div>
        )}

        {!isLoadingRequests && requestErrorMessage && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6">
            <p className="text-sm font-medium text-on-surface-variant mb-3">{requestErrorMessage}</p>
            <button
              onClick={() => {
                void loadPendingRequests();
              }}
              className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-semibold"
            >
              {t('Try Again')}
            </button>
          </div>
        )}

        {!isLoadingRequests && !requestErrorMessage && pendingRequests.length === 0 && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-8 text-on-surface-variant font-medium">
            {t('No pending booking requests right now.')}
          </div>
        )}

        {!isLoadingRequests && !requestErrorMessage && pendingRequests.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingRequests.map((request) => {
              const dateRange = `${formatBookingDate(request.startDate)} - ${formatBookingDate(request.endDate)}`;

              return (
                <article
                  key={request.id}
                  className="bg-white border border-outline-variant/10 rounded-3xl p-6 shadow-sm space-y-4"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {t('Reservation ID')}: {request.reservationId}
                    </p>
                    <h3 className="text-2xl font-black text-primary mt-1">{request.equipmentName}</h3>
                    <p className="text-sm text-on-surface-variant">{request.category}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <p className="text-on-surface-variant">
                      {t('Dates')}: <span className="font-semibold text-on-surface">{dateRange}</span>
                    </p>
                    <p className="text-on-surface-variant">
                      {t('Quoted Total')}: <span className="font-semibold text-on-surface">{formatINR(request.total)}</span>
                    </p>
                    <p className="text-on-surface-variant">
                      {t('Renter')}: <span className="font-semibold text-on-surface">{request.renterName || t('Unknown')}</span>
                    </p>
                    <p className="text-on-surface-variant">
                      {t('Phone')}: <span className="font-semibold text-on-surface">{request.renterPhone || t('Not provided')}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        void handleBookingAction(request.id, 'reject');
                      }}
                      disabled={isUpdatingRequestId === request.id}
                      className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isUpdatingRequestId === request.id ? t('Updating...') : t('Reject')}
                    </button>
                    <button
                      onClick={() => {
                        void handleBookingAction(request.id, 'approve');
                      }}
                      disabled={isUpdatingRequestId === request.id}
                      className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container font-bold hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isUpdatingRequestId === request.id ? t('Updating...') : t('Approve')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Equipment Management List */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-primary">{t('Your Equipment')}</h2>
          <button className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
            {t('View All Units')} <ArrowRight size={16} />
          </button>
        </div>

        {isLoadingEquipment && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 text-on-surface-variant text-sm font-medium">
            {t('Loading your listings...')}
          </div>
        )}

        {!isLoadingEquipment && equipmentErrorMessage && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 mb-6">
            <p className="text-sm font-medium text-on-surface-variant mb-3">{equipmentErrorMessage}</p>
            <button
              onClick={() => {
                void loadEquipment();
              }}
              className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-semibold"
            >
              {t('Try Again')}
            </button>
          </div>
        )}

        {!isLoadingEquipment && !equipmentErrorMessage && equipmentSuccessMessage && (
          <div className="bg-green-50 border border-green-200 rounded-3xl p-4 mb-6">
            <p className="text-sm font-semibold text-green-700">{equipmentSuccessMessage}</p>
          </div>
        )}

        {!isLoadingEquipment && equipment.length === 0 && (
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-8">
            <p className="text-on-surface-variant font-medium mb-4">{t('No listings yet. Create your first listing to start earning.')}</p>
            <button
              onClick={() => onNavigate('list-equipment')}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold"
            >
              <Plus size={16} />
              {t('New Listing')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {equipment.map((item) => {
            const status = item.status ?? 'available';

            return (
            <div 
              key={item.id}
              onClick={() => onOpenEquipmentDetails(item.id)}
              className="group bg-white border border-outline-variant/10 rounded-3xl overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="sm:w-48 h-48 sm:h-auto overflow-hidden">
                <img 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  src={item.imageUrl || FALLBACK_IMAGE} 
                  alt={item.name} 
                />
              </div>
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      toBadgeClasses(status)
                    }`}>
                      {toStatusLabel(status)}
                    </span>
                    <span className="text-xs font-bold text-on-surface-variant">{t('{amount} / Day', { amount: formatINR(item.dailyRate ?? 0) })}</span>
                  </div>
                  <h3 className="text-lg font-bold text-primary leading-tight">{item.brandModel || item.name}</h3>
                  <p className="text-sm text-on-surface-variant mt-1">{item.location || toSubtitle(status)}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    className="flex-1 py-2 text-xs font-bold bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-colors rounded-xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {t('Edit Listing')}
                  </button>
                  <button
                    className="flex-1 py-2 text-xs font-bold bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-colors rounded-xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {t('Availability')}
                  </button>
                  <button
                    className="flex-1 py-2 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors rounded-xl inline-flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDeleteDialog(item.id, item.brandModel || item.name);
                    }}
                    disabled={isDeletingEquipmentId === item.id}
                  >
                    <Trash2 size={14} />
                    {isDeletingEquipmentId === item.id ? t('Deleting...') : t('Delete')}
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      </section>

      {listingToDelete && (
        <div
          className="fixed inset-0 z-140 bg-black/55 flex items-center justify-center p-4"
          onClick={closeDeleteDialog}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-outline-variant/20 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-outline-variant/15 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">{t('Danger Zone')}</p>
                <h3 className="text-2xl font-black text-primary mt-1">{t('Delete Listing')}</h3>
              </div>
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="h-9 w-9 rounded-xl bg-surface-container-low text-on-surface-variant flex items-center justify-center"
                disabled={isDeletingEquipmentId !== null}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5">
              <p className="text-on-surface-variant leading-relaxed">
                {t('You are about to delete "{name}". This action cannot be undone.', {
                  name: listingToDelete.name,
                })}
              </p>

              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                <p className="text-sm font-semibold text-rose-700">{t('To confirm, type DELETE below.')}</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="delete-confirmation" className="text-sm font-bold text-on-surface">
                  {t('Confirmation')}
                </label>
                <input
                  id="delete-confirmation"
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(event) => {
                    setDeleteConfirmationText(event.target.value);
                    if (deleteDialogErrorMessage) {
                      setDeleteDialogErrorMessage('');
                    }
                  }}
                  placeholder="DELETE"
                  autoComplete="off"
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              {deleteDialogErrorMessage && (
                <p className="text-sm font-semibold text-rose-700">{deleteDialogErrorMessage}</p>
              )}
            </div>

            <div className="px-6 py-5 border-t border-outline-variant/15 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-semibold"
                disabled={isDeletingEquipmentId !== null}
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteListing();
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isDeletingEquipmentId !== null || deleteConfirmationText.trim() !== 'DELETE'}
              >
                <Trash2 size={16} />
                {isDeletingEquipmentId !== null ? t('Deleting...') : t('Delete Listing')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
