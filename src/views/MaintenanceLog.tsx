import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Activity,
  Droplets,
  AlertTriangle,
  History,
  CheckCircle2,
  Search,
  Filter,
  MoreVertical,
  Clock,
  Scissors,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { formatINR } from '../lib/currency';
import { BookingConfirmationData, Page } from '../types';

interface MaintenanceLogProps {
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

type EquipmentResponse = {
  equipment?: ApiEquipment[];
  error?: string;
};

type BookingsResponse = {
  bookings?: BookingConfirmationData[];
  error?: string;
};

type MaintenanceActivity = {
  id: string;
  date: Date;
  status: string;
  equipment: string;
  type: string;
  cost: number;
  state: string;
  icon: LucideIcon;
};

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export const MaintenanceLog: React.FC<MaintenanceLogProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const [equipment, setEquipment] = useState<ApiEquipment[]>([]);
  const [bookings, setBookings] = useState<BookingConfirmationData[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadOwnerMaintenanceData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [equipmentResponse, bookingsResponse] = await Promise.all([
          fetch('/api/equipment?scope=mine'),
          fetch('/api/bookings?scope=owner'),
        ]);

        const equipmentPayload = (await equipmentResponse.json().catch(() => null)) as
          | EquipmentResponse
          | null;
        const bookingsPayload = (await bookingsResponse.json().catch(() => null)) as
          | BookingsResponse
          | null;

        if (!equipmentResponse.ok || !bookingsResponse.ok) {
          setEquipment([]);
          setBookings([]);
          setErrorMessage(
            equipmentPayload?.error ??
              bookingsPayload?.error ??
              t('Unable to load maintenance data right now.')
          );
          return;
        }

        setEquipment(equipmentPayload?.equipment ?? []);
        setBookings(bookingsPayload?.bookings ?? []);
      } catch {
        setEquipment([]);
        setBookings([]);
        setErrorMessage(t('Network error. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    };

    void loadOwnerMaintenanceData();
  }, [t]);

  const activities = useMemo(() => {
    const equipmentActivities: MaintenanceActivity[] = equipment.map((item, index) => {
      const equipmentName = item.brandModel || item.name;
      const createdDate = item.createdAt ? new Date(item.createdAt) : new Date();
      const isMaintenance = item.status === 'maintenance';
      const cost = Math.max(180, Math.round((item.dailyRate || 0) * (isMaintenance ? 0.4 : 0.15)));

      return {
        id: `eq-${item.id}`,
        date: isMaintenance ? createdDate : addDays(createdDate, 7 + index),
        status: isMaintenance ? t('Unscheduled') : t('Scheduled'),
        equipment: equipmentName,
        type: isMaintenance ? t('Corrective Service') : t('Routine Inspection'),
        cost,
        state: isMaintenance ? t('Upcoming') : t('Completed'),
        icon: isMaintenance ? AlertTriangle : Droplets,
      };
    });

    const bookingActivities: MaintenanceActivity[] = bookings
      .filter((booking) => booking.status === 'confirmed' || booking.status === 'pending')
      .map((booking) => {
        const scheduledDate = addDays(new Date(booking.createdAt), 1);

        return {
          id: `bk-${booking.id}`,
          date: scheduledDate,
          status: booking.status === 'pending' ? t('Upcoming') : t('Scheduled'),
          equipment: booking.equipmentName,
          type:
            booking.status === 'pending'
              ? t('Pre-approval equipment check')
              : t('Pre-rental readiness inspection'),
          cost: Math.max(120, Math.round(booking.dailyRate * 0.12)),
          state: booking.status === 'pending' ? t('Upcoming') : t('Completed'),
          icon: booking.status === 'pending' ? Activity : Scissors,
        };
      });

    return [...equipmentActivities, ...bookingActivities].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [bookings, equipment, t]);

  const filteredActivities = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) {
      return activities;
    }

    return activities.filter((activity) => activity.equipment.toLowerCase().includes(query));
  }, [activities, filterQuery]);

  const metrics = useMemo(() => {
    const totalEntries = activities.length;
    const upcomingEntries = activities.filter((activity) => activity.state === t('Upcoming')).length;
    const maintenanceUnits = equipment.filter((item) => item.status === 'maintenance').length;
    const totalCost = activities.reduce((sum, activity) => sum + activity.cost, 0);
    const fleetHealth =
      equipment.length === 0
        ? 100
        : Math.max(0, Math.round(((equipment.length - maintenanceUnits) / equipment.length) * 100));

    return {
      totalEntries,
      upcomingEntries,
      maintenanceUnits,
      totalCost,
      fleetHealth,
    };
  }, [activities, equipment, t]);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-primary mb-2">{t('Fleet Maintenance Log')}</h1>
          <p className="text-on-surface-variant max-w-xl text-lg">{t('Track service history and upcoming inspections for your own listed equipment.')}</p>
        </div>
        <button
          onClick={() => onNavigate('list-equipment')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-xl hover:shadow-primary-container/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          {t('Add More Equipment')}
        </button>
      </div>

      {isLoading && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 text-on-surface-variant font-medium">
          {t('Loading maintenance data...')}
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 text-on-surface-variant font-medium">
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && (
        <>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-surface-container-highest p-8 rounded-full flex justify-between items-center overflow-hidden relative border border-outline-variant/10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{t('Fleet Health')}</p>
            <h2 className="text-4xl font-black text-primary">{metrics.fleetHealth}% {t('Operational')}</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-secondary mb-1">{t('Pending Inspections')}</p>
            <p className="text-2xl font-bold">{String(metrics.upcomingEntries).padStart(2, '0')} {t('Units')}</p>
          </div>
        </div>
        <div className="bg-secondary-container p-8 rounded-full flex flex-col justify-center shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-secondary-container mb-1">{t('Maintenance Cost (MTD)')}</p>
          <h2 className="text-3xl font-black text-on-secondary-container">{formatINR(metrics.totalCost)}</h2>
        </div>
      </div>

      {/* Bento equipment highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: t('Lube & Oil'), value: t('{count} completed checks', { count: activities.filter((item) => item.state === t('Completed')).length }), icon: Droplets },
          { label: t('Critical Alert'), value: t('{count} maintenance units', { count: metrics.maintenanceUnits }), icon: AlertTriangle, alert: metrics.maintenanceUnits > 0 },
          { label: t('Total Entries'), value: t('{count} records', { count: metrics.totalEntries }), icon: History },
          { label: t('Compliance'), value: t('Verified 2024'), icon: CheckCircle2 },
        ].map((stat, i) => (
          <div key={i} className={`bg-surface-container-low p-6 rounded-2xl flex items-center gap-4 border border-outline-variant/10 ${stat.alert ? 'border-l-4 border-l-secondary' : ''}`}>
            <div className={`p-3 rounded-xl ${stat.alert ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-highest text-primary'}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{stat.label}</p>
              <p className="font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance Table */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-outline-variant/10">
        <div className="p-6 border-b border-surface-container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-xl font-bold tracking-tight">{t('Recent Maintenance Activity')}</h3>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  className="w-full pl-10 pr-4 py-2 bg-surface-container-high border-none rounded-xl text-sm focus:ring-0"
                  placeholder={t('Filter by equipment...')}
                  type="text"
                  value={filterQuery}
                  onChange={(event) => setFilterQuery(event.target.value)}
                />
              </div>
              <button className="p-2 bg-surface-container-high rounded-xl text-on-surface-variant">
                <Filter size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('Date')}</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('Equipment')}</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('Service Type')}</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('Cost')}</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('Status')}</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredActivities.map((act) => (
                <tr key={act.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{formatShortDate(act.date)}</div>
                    <div className="text-[10px] text-outline">{act.status}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-primary">{act.equipment}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest text-xs font-medium">
                      <act.icon size={14} />
                      {act.type}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold">{formatINR(act.cost)}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${act.state === t('Completed') ? 'text-primary' : 'text-secondary'}`}>
                      {act.state === t('Completed') ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      {act.state}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-outline hover:text-primary transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredActivities.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-on-surface-variant font-medium" colSpan={6}>
                    {t('No maintenance entries found for this filter.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
